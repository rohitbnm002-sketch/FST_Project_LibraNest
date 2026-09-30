const router = require('express').Router();
const Book = require('../models/Book');
const Issue = require('../models/Issue');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect);

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/books?q=&category=  - search & filter
router.get('/', async (req, res) => {
  const { q, category } = req.query;
  const filter = {};
  if (q) {
    const r = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ title: r }, { author: r }, { isbn: r }];
  }
  if (category) filter.category = category;
  res.json(await Book.find(filter).sort({ title: 1 }));
});

// GET /api/books/categories
router.get('/categories', async (req, res) => {
  res.json(await Book.distinct('category'));
});

// POST /api/books - librarian adds a book
router.post('/', adminOnly, async (req, res) => {
  try {
    const { title, author, category, isbn } = req.body;
    const copies = parseInt(req.body.copies, 10);
    if (!title || !author || !copies || copies < 1) return res.status(400).json({ message: 'Title, author and copies (1+) required' });
    const book = await Book.create({ title, author, category: category || 'General', isbn, copies, available: copies });
    res.status(201).json(book);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// DELETE /api/books/:id - only if no copy is currently issued
router.delete('/:id', adminOnly, async (req, res) => {
  const active = await Issue.countDocuments({ book: req.params.id, status: 'Issued' });
  if (active) return res.status(400).json({ message: 'Cannot delete: copies are currently issued' });
  await Book.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
