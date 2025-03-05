import React, { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../firebase/firebase";
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  EmailAuthProvider,
  deleteUser,
  reauthenticateWithCredential,
  updatePassword
} from "firebase/auth";
import { getAuthErrorMessage } from '../utils/errorMessages';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      setAuthError(null);
      return result;
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  const signUpWithEmail = async (email, password, displayName) => {
    try {
      if (password.length < 6) {
        // eslint-disable-next-line no-throw-literal
        throw { code: 'auth/weak-password' };
      }
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName });
      setAuthError(null);
      return result;
    } catch (error) {
      setAuthError(getAuthErrorMessage(error));
      throw error;
    }
  };

  const signInWithEmail = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      setAuthError(null);
      return result;
    } catch (error) {
      setAuthError(getAuthErrorMessage(error));
      throw error;
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    if (!currentUser) throw new Error('No user logged in');
    if (currentPassword === newPassword) {
      throw new Error('New password must be different from current password');
    }
    
    try {
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        currentPassword
      );
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
    } catch (error) {
      throw error;
    }
  };

  const deleteAccount = async (password) => {
    if (!currentUser) throw new Error('No user logged in');
    
    try {
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        password
      );
      await reauthenticateWithCredential(currentUser, credential);
      await deleteUser(currentUser);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    return signOut(auth);
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    logout,
    authError,
    changePassword,
    deleteAccount
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}