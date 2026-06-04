/**
 * 📱 Injection globale du header X-Device-Id sur toutes les requêtes Axios.
 * Doit être importé très tôt (ex: dans App.jsx) pour s'appliquer à tous les modules.
 */
import axios from 'axios';
import { getDeviceId } from '../utils/deviceFingerprint.js';

const deviceId = getDeviceId();

// S'assure que tous les futurs headers communs incluent le deviceId
axios.defaults.headers.common['X-Device-Id'] = deviceId;

// Intercepteur de secours pour les instances créées dynamiquement
axios.interceptors.request.use(
  (config) => {
    if (!config.headers['X-Device-Id']) {
      config.headers['X-Device-Id'] = deviceId;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default deviceId;
