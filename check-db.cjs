const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/ev_charging').then(async () => {
  const db = mongoose.connection.db;
  const collection = db.collection('chargingrequests');
  
  try {
    const count = await collection.countDocuments();
    const withContactInfo = await collection.countDocuments({ contactInfo: { $exists: true } });
    const withPhoneNumber = await collection.countDocuments({ phoneNumber: { $exists: true } });
    
    console.log(`Total documents: ${count}`);
    console.log(`With contactInfo: ${withContactInfo}`);
    console.log(`With phoneNumber: ${withPhoneNumber}`);
    
    // Show a sample document to see structure
    if (withContactInfo > 0) {
      const sample = await collection.findOne({ contactInfo: { $exists: true } });
      console.log('Sample with contactInfo:', JSON.stringify(sample, null, 2));
    }
    
    if (withPhoneNumber > 0) {
      const sample = await collection.findOne({ phoneNumber: { $exists: true } });
      console.log('Sample with phoneNumber:', JSON.stringify(sample, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}).catch(console.error);
