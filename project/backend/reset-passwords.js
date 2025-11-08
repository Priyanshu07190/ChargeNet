const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;

// User Schema (simplified)
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  name: String,
  phone: String,
  user_type: String
});

const User = mongoose.model('User', userSchema);

async function resetPasswords() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // New password
    const newPassword = '1234567890';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update first user
    const user1 = await User.findOneAndUpdate(
      { email: 'priyanshubhargav95@gmail.com' },
      { password: hashedPassword },
      { new: true }
    );

    if (user1) {
      console.log('✅ Password reset for: priyanshubhargav95@gmail.com');
    } else {
      console.log('❌ User not found: priyanshubhargav95@gmail.com');
    }

    // Update second user
    const user2 = await User.findOneAndUpdate(
      { email: 'ramesh.singh.0909098@gmail.com' },
      { password: hashedPassword },
      { new: true }
    );

    if (user2) {
      console.log('✅ Password reset for: ramesh.singh.0909098@gmail.com');
    } else {
      console.log('❌ User not found: ramesh.singh.0909098@gmail.com');
    }

    console.log('\n🎉 Password reset complete!');
    console.log('New password for both users: 1234567890');
    
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

resetPasswords();
