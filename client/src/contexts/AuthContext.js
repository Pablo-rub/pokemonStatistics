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
import axios from 'axios';
import { db } from '../firebase/firebase';
import { 
  collection, doc, setDoc, deleteDoc, getDoc 
} from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [savedReplaysIds, setSavedReplaysIds] = useState([]);

  const createUserRecord = async (user) => {
    try {
      await axios.post('/api/users/saved-replays', {
        userId: user.uid,
      });
    } catch (error) {
      console.error('Error creating user record:', error);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      try {
        const response = await axios.get(`/api/users/${result.user.uid}/saved-replays`);
        if (!response.data || response.data.length === 0) {
          await createUserRecord(result.user);
        }
      } catch (error) {
        if (error.response && error.response.status === 404) {
          await createUserRecord(result.user);
        }
      }
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
        // replicamos la forma de Firebase para que getAuthErrorMessage lo coja
        // eslint-disable-next-line no-throw-literal
        throw { code: 'auth/weak-password' };
      }
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName });
      await createUserRecord(result.user);
      setAuthError(null);
      return result;
    } catch (error) {
      const msg = getAuthErrorMessage(error);
      setAuthError(msg);
      // relanzamos un Error con nuestro mensaje en lugar del original
      throw new Error(msg);
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

  const changePassword = async (oldPassword, newPassword) => {
    if (!currentUser) throw new Error('No user logged in');
    
    try {
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        oldPassword
      );
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
    } catch (error) {
      throw error;
    }
  };

  const deleteAccount = async (password = null) => {
    if (!currentUser) throw new Error('No user logged in');
    
    try {
      if (currentUser.providerData[0].providerId === 'password' && password) {
        const credential = EmailAuthProvider.credential(
          currentUser.email,
          password
        );
        await reauthenticateWithCredential(currentUser, credential);
      }
      await axios.delete(`/api/users/${currentUser.uid}/saved-replays`);
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

  useEffect(() => {
    if (!currentUser) {
      setSavedReplaysIds([]);
      return;
    }
    axios
      .get(`/api/users/${currentUser.uid}/saved-replays`)
      .then(res =>
        setSavedReplaysIds(res.data.map(g => g.replay_id))
      )
      .catch(console.error);
  }, [currentUser]);

  const save = async replayId => {
    await axios.post(`/api/users/${currentUser.uid}/saved-replays`, { replayId });
    setSavedReplaysIds(ids => [...ids, replayId]);
  };

  const unsave = async replayId => {
    await axios.delete(
      `/api/users/${currentUser.uid}/saved-replays/${replayId}`
    );
    setSavedReplaysIds(ids => ids.filter(id => id !== replayId));
  };

  const value = {
    currentUser,
    savedReplaysIds,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    logout,
    authError,
    changePassword,
    deleteAccount,
    save,
    unsave,
    EmailAuthProvider,
    reauthenticateWithCredential,
    updatePassword
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useSavedReplays = () => {
  const { currentUser } = useAuth();
  const base = collection(db, 'users', currentUser.uid, 'savedReplays');

  const isSaved = async (id) => {
    const snap = await getDoc(doc(base, id));
    return snap.exists();
  };

  const save = async (game) => {
    await setDoc(doc(base, game.replay_id), game);
  };

  const unsave = async (replayId) => {
    await deleteDoc(doc(base, replayId));
  };

  return { isSaved, save, unsave };
};