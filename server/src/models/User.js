import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  employeeId: { type: String, required: true, unique: true, trim: true, uppercase: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true, minlength: 8, select: false },
  role: { type: String, enum: ['employee', 'hr'], default: 'employee', required: true },
  createdAt: { type: Date, default: Date.now, immutable: true },
});

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.set('toJSON', {
  transform(_document, result) {
    delete result.password;
    delete result.__v;
    return result;
  },
});

export default mongoose.model('User', userSchema);
