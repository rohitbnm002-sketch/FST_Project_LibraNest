const router = require('express').Router();
const Book = require('../models/Book');
const Issue = require('../models/Issue');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect);

const LOAN_DAYS = 14;
const FINE_PER_DAY = 5; // Rs per day after due date
const DAY = 24 * 60 * 60 * 1000;
const MAX_BOOKS = 3;

const calcFine = (due, end = new Date()) =>
  end > due ? Math.ceil((end - due) / DAY) * FINE_PER_DAY : 0;

// attach live fine for books that are still issued
const withFine = (i) => {
  const o = i.toObject();
  if (o.status === 'Issued') o.fine = calcFine(o.dueDate);
  return o;
};

// POST /api/issues/:bookId - student borrows a book
router.post('/:bookId', async (req, res) => {
  try {
    const active = await Issue.find({ student: req.user.id, status: 'Issued' });
    if (active.length >= MAX_BOOKS) return res.status(400).json({ message: `You can borrow only ${MAX_BOOKS} books at a time` });
    if (active.some((i) => i.book.toString() === req.params.bookId))
      return res.status(400).json({ message: 'You already have this book' });

    // atomic: only decrement if a copy is available
    const book = await Book.findOneAndUpdate(
      { _id: req.params.bookId, available: { $gt: 0 } },
      { $inc: { available: -1 } }
    );
    if (!book) return res.status(400).json({ message: 'No copies available right now' });

    const issue = await Issue.create({
      student: req.user.id,
      book: book._id,
      dueDate: new Date(Date.now() + LOAN_DAYS * DAY),
    });
    res.status(201).json(issue);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET /api/issues/mine - my borrowing history
router.get('/mine', async (req, res) => {
  const list = await Issue.find({ student: req.user.id }).populate('book', 'title author').sort({ createdAt: -1 });
  res.json(list.map(withFine));
});

// GET /api/issues - librarian: all records (?status=Issued)
router.get('/', adminOnly, async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  const list = await Issue.find(filter).populate('book', 'title author').populate('student', 'name email').sort({ createdAt: -1 });
  res.json(list.map(withFine));
});

// GET /api/issues/stats - librarian dashboard numbers
router.get('/stats', adminOnly, async (req, res) => {
  const [books, issued, overdue, members, agg] = await Promise.all([
    Book.countDocuments(),
    Issue.countDocuments({ status: 'Issued' }),
    Issue.countDocuments({ status: 'Issued', dueDate: { $lt: new Date() } }),
    User.countDocuments({ role: 'student' }),
    Book.aggregate([{ $group: { _id: null, total: { $sum: '$available' } } }]),
  ]);
  res.json({ books, issued, overdue, members, availableCopies: agg[0] ? agg[0].total : 0 });
});

// PATCH /api/issues/:id/return - return a book (owner or librarian)
router.patch('/:id/return', async (req, res) => {
  const issue = await Issue.findById(req.params.id);
  if (!issue) return res.status(404).json({ message: 'Record not found' });
  if (issue.status === 'Returned') return res.status(400).json({ message: 'Already returned' });
  if (req.user.role !== 'admin' && issue.student.toString() !== req.user.id)
    return res.status(403).json({ message: 'Not your book' });

  issue.returnDate = new Date();
  issue.fine = calcFine(issue.dueDate, issue.returnDate);
  issue.status = 'Returned';
  await issue.save();
  await Book.findByIdAndUpdate(issue.book, { $inc: { available: 1 } });
  res.json(issue);
});

module.exports = router;
