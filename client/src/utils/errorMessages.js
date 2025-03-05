export const getAuthErrorMessage = (error) => {
  switch (error.code) {
    // Sign up errors
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please use a different email or try signing in.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters long.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    
    // Sign in errors
    case 'auth/user-not-found':
      return 'No account found with this email.';
    case 'auth/wrong-password':
      return 'Incorrect password.';
    case 'auth/invalid-credential':
      return 'Invalid email or password.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    
    // Password change errors
    case 'auth/requires-recent-login':
      return 'Please sign in again to change your password.';
    
    default:
      return error.message || 'An error occurred. Please try again.';
  }
};