/**
 * Simple migration script to convert contactInfo to phoneNumber
 */

const mongoose = require('mongoose');

// Define the schema inline for migration
const chargingRequestSchema = new mongoose.Schema({}, { strict: false });
const ChargingRequest = mongoose.model('ChargingRequest', chargingRequestSchema);

const migrate = async () => {
  try {
    console.log('Starting migration: contactInfo -> phoneNumber');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/evhelper');
    console.log('Connected to MongoDB');

    // Get the collection directly
    const db = mongoose.connection.db;
    const collection = db.collection('chargingrequests');

    // Find documents to migrate
    const docsToMigrate = await collection.find({
      contactInfo: { $exists: true, $ne: '' },
      phoneNumber: { $exists: false }
    }).toArray();

    console.log(`Found ${docsToMigrate.length} requests to migrate`);

    if (docsToMigrate.length === 0) {
      console.log('No documents need migration. ✅');
      return;
    }

    // Update each document
    for (const doc of docsToMigrate) {
      await collection.updateOne(
        { _id: doc._id },
        { 
          $set: { phoneNumber: doc.contactInfo.trim() },
          $unset: { contactInfo: 1 }
        }
      );
      console.log(`✓ Migrated request ${doc._id}: "${doc.contactInfo}" -> "${doc.contactInfo.trim()}"`);
    }

    console.log('Migration completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

migrate();
