const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

function getCategoryBadgeUrl(category, title) {
  const normalizedCategory = String(category || 'general').trim().toLowerCase();
  const label = encodeURIComponent(String(title || 'Item').trim().split(' ')[0]);

  const colorMap = {
    electronics: '2563eb', // Blue
    apparel: 'dc2626',     // Red
    accessories: 'ec4899', // Pink
    food: '0f172a',        // Black
  };

  const bgHex = colorMap[normalizedCategory] || '475569';
  return `https://placehold.co/300x300/${bgHex}/ffffff/png?text=${label}`;
}

// In-memory database with uniform category-based thumbnails
let items = [
  {
    id: 1,
    title: 'Wireless Mechanical Keyboard',
    price: 49.99,
    category: 'electronics',
    description: 'Compact 75% mechanical keyboard with hot-swappable switches and USB-C charging.',
    image: getCategoryBadgeUrl('electronics', 'Wireless Mechanical Keyboard'),
    rating: { rate: 4.8, count: 120 },
  },
  {
    id: 2,
    title: 'Classic Cotton Hoodie',
    price: 29.50,
    category: 'apparel',
    description: 'Heavyweight fleece pullover hoodie for everyday wear.',
    image: getCategoryBadgeUrl('apparel', 'Classic Cotton Hoodie'),
    rating: { rate: 4.5, count: 85 },
  },
  {
    id: 3,
    title: 'Pearl Hoop Earrings',
    price: 18.00,
    category: 'accessories',
    description: 'Lightweight everyday accessories with polished clasp.',
    image: getCategoryBadgeUrl('accessories', 'Pearl Hoop Earrings'),
    rating: { rate: 4.9, count: 210 },
  },
  {
    id: 4,
    title: 'Artisan Dark Chocolate Bar',
    price: 6.50,
    category: 'food',
    description: '70% single-origin dark chocolate snack bar.',
    image: getCategoryBadgeUrl('food', 'Artisan Dark Chocolate Bar'),
    rating: { rate: 4.7, count: 64 },
  },
];

// GET: Fetch all items
app.get('/api/items', (req, res) => {
  console.log(`[GET] /api/items - Returned ${items.length} items`);
  res.status(200).json(items);
});

// POST: Add a new item (with input validation)
app.post('/api/items', (req, res) => {
  const { title, price, category, description } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required.' });
  }
  const numericPrice = Number(price);
  if (Number.isNaN(numericPrice) || numericPrice <= 0) {
    return res.status(400).json({ error: 'Price must be a valid positive number.' });
  }

  const cleanTitle = title.trim();
  const cleanCategory = (category && category.trim().toLowerCase()) || 'general';

  const newItem = {
    id: Date.now(),
    title: cleanTitle,
    price: numericPrice,
    category: cleanCategory,
    description: (description && description.trim()) || 'Added via IT37 Mobile App.',
    image: getCategoryBadgeUrl(cleanCategory, cleanTitle),
    rating: { rate: 5.0, count: 1 },
  };

  items.unshift(newItem);
  console.log(`[POST] /api/items - Created "${newItem.title}" (${newItem.category}, $${newItem.price})`);
  res.status(201).json(newItem);
});

// PUT: Update an existing item by ID
app.put('/api/items/:id', (req, res) => {
  const itemId = Number(req.params.id);
  const index = items.findIndex((item) => item.id === itemId);

  if (index === -1) {
    console.log(`[PUT] /api/items/${req.params.id} - 404 Not Found`);
    return res.status(404).json({ error: 'Item not found.' });
  }

  const { title, price, category, description } = req.body;
  const current = items[index];

  if (title !== undefined && !String(title).trim()) {
    return res.status(400).json({ error: 'Title cannot be empty.' });
  }

  let nextPrice = current.price;
  if (price !== undefined) {
    const numericPrice = Number(price);
    if (Number.isNaN(numericPrice) || numericPrice <= 0) {
      return res.status(400).json({ error: 'Price must be a valid positive number.' });
    }
    nextPrice = numericPrice;
  }

  const nextTitle = title !== undefined ? String(title).trim() : current.title;
  const nextCategory =
    category !== undefined
      ? String(category).trim().toLowerCase() || 'general'
      : current.category;

  const updatedItem = {
    ...current,
    title: nextTitle,
    price: nextPrice,
    category: nextCategory,
    description:
      description !== undefined ? String(description).trim() : current.description,
    image: getCategoryBadgeUrl(nextCategory, nextTitle),
  };

  items[index] = updatedItem;
  console.log(`[PUT] /api/items/${itemId} - Updated "${updatedItem.title}" (${updatedItem.category}, $${updatedItem.price})`);
  res.status(200).json(updatedItem);
});

// DELETE: Remove an item by ID
app.delete('/api/items/:id', (req, res) => {
  const itemId = Number(req.params.id);
  const index = items.findIndex((item) => item.id === itemId);

  if (index === -1) {
    console.log(`[DELETE] /api/items/${req.params.id} - 404 Not Found`);
    return res.status(404).json({ error: 'Item not found.' });
  }

  const [deletedItem] = items.splice(index, 1);
  console.log(`[DELETE] /api/items/${itemId} - Deleted "${deletedItem.title}"`);
  res.status(200).json({ message: 'Item deleted successfully.', deleted: deletedItem });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`IT37 API Server running at http://192.168.8.35:${PORT}`);
});