const mongoose = require('mongoose');

const migrate = async () => {
  try {
    console.log('Starting migration: contactInfo -> phoneNumber');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/evhelper');
    console.log('Connected to MongoDB');

    // Get all collections to find the correct one
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));

    // Find the charging requests collection (it might be named differently)
    let collection = null;
    const possibleNames = ['chargingrequests', 'charging_requests', 'chargingrequest', 'chargingrequests'];
    
    for (const name of possibleNames) {
      if (collections.find(c => c.name === name)) {
        collection = db.collection(name);
        console.log(`Using collection: ${name}`);
        break;
      }
    }

    if (!collection) {
      console.log('Charging requests collection not found!');
      return;
    }

    // Get all documents to see the structure
    const allDocs = await collection.find({}).toArray();
    console.log(`Total documents in collection: ${allDocs.length}`);

    // Find documents that need migration (have contactInfo but no phoneNumber)
    const docsToMigrate = allDocs.filter(doc => 
      doc.contactInfo && doc.contactInfo.trim() !== '' && !doc.phoneNumber
    );

    console.log(`Found ${docsToMigrate.length} documents to migrate`);

    if (docsToMigrate.length === 0) {
      console.log('No documents need migration. ✅');
      
      // Check current state
      const withContactInfo = allDocs.filter(doc => doc.contactInfo).length;
      const withPhoneNumber = allDocs.filter(doc => doc.phoneNumber).length;
      console.log(`Current state - With contactInfo: ${withContactInfo}, With phoneNumber: ${withPhoneNumber}`);
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

    // Verify migration
    const remainingWithContactInfo = allDocs.filter(doc => doc.contactInfo).length;
    const updatedWithPhoneNumber = allDocs.filter(doc => doc.phoneNumber).length;

    console.log(`Verification:`);
    console.log(`- Remaining with contactInfo: ${remainingWithContactInfo}`);
    console.log(`- With phoneNumber: ${updatedWithPhoneNumber}`);

    if (remainingWithContactInfo === 0) {
      console.log('✅ All documents successfully migrated!');
    } else {
      console.log('⚠️  Some documents still have contactInfo field - manual review may be needed');
    }

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

migrate();
