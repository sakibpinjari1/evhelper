/**
 * Migration script: Convert contactInfo field to phoneNumber in ChargingRequest collection
 * This script handles the transition from optional contactInfo to required phoneNumber
 */

const mongoose = require('mongoose');
const ChargingRequest = require('./src/models/ChargingRequest.js');

const migrateContactInfoToPhone = async () => {
  try {
    console.log('Starting migration: contactInfo -> phoneNumber');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/evhelper');
    console.log('Connected to MongoDB');

    // Find all requests that have contactInfo but no phoneNumber
    const requestsToMigrate = await ChargingRequest.find({
      contactInfo: { $exists: true, $ne: '' },
      phoneNumber: { $exists: false }
    });

    console.log(`Found ${requestsToMigrate.length} requests to migrate`);

    // Update each request
    for (const request of requestsToMigrate) {
      // Check if contactInfo looks like a phone number
      const phoneRegex = /^[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$/;
      
      let phoneNumber = request.contactInfo;
      
      // If contactInfo doesn't look like a phone number, we'll still migrate it
      // but log a warning for manual review
      if (!phoneRegex.test(request.contactInfo.trim())) {
        console.log(`⚠️  Warning: Request ${request._id} has contactInfo that doesn't look like a phone number: "${request.contactInfo}"`);
        console.log(`   This will be migrated but may need manual review`);
      }

      await ChargingRequest.updateOne(
        { _id: request._id },
        { 
          $set: { phoneNumber: phoneNumber.trim() },
          $unset: { contactInfo: 1 }
        }
      );

      console.log(`✓ Migrated request ${request._id}: "${request.contactInfo}" -> "${phoneNumber}"`);
    }

    console.log('Migration completed successfully!');
    
    // Verify migration
    const remainingWithContactInfo = await ChargingRequest.countDocuments({ 
      contactInfo: { $exists: true } 
    });
    const withPhoneNumber = await ChargingRequest.countDocuments({ 
      phoneNumber: { $exists: true } 
    });

    console.log(`Verification:`);
    console.log(`- Requests with contactInfo: ${remainingWithContactInfo}`);
    console.log(`- Requests with phoneNumber: ${withPhoneNumber}`);

    if (remainingWithContactInfo === 0) {
      console.log('✅ All requests successfully migrated!');
    } else {
      console.log('⚠️  Some requests still have contactInfo field - manual review may be needed');
    }

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run migration if this file is executed directly
if (require.main === module) {
  migrateContactInfoToPhone();
}

module.exports = migrateContactInfoToPhone;
