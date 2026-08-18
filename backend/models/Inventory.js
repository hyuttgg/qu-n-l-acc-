const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema({
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
    unique: true,
  },
  fruits: {
    type: [String], // Stored fruits in inventory, e.g. ["Dragon", "Leopard", "Dough"]
    default: [],
  },
  weapons: {
    type: [String], // Swords, e.g. ["Cursed Dual Katana", "Dark Blade"]
    default: [],
  },
  guns: {
    type: [String], // Guns, e.g. ["Soul Guitar", "Kabucha"]
    default: [],
  },
  styles: {
    type: [String], // Fighting styles, e.g. ["Godhuman", "Superhuman"]
    default: [],
  },
  materials: [{
    name: { type: String, required: true },
    quantity: { type: Number, default: 1 },
  }],
  accessories: {
    type: [String], // e.g. ["Valkyrie Helm", "Pale Scarf"]
    default: [],
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Inventory', InventorySchema);
