const API_BASE = '/api';
const DASHBOARD_STATS_UPDATE_KEY = 'takapay_dashboard_stats_updated';
const DASHBOARD_STATS_UPDATE_EVENT = 'takapay:dashboard-stats-updated';

// Cache en mémoire vive (RAM navigateur) pour instantanéité des navigations
const memoryCache = new Map();
const DEFAULT_TTL_MS = 120 * 1000; // 2 minutes

const getCached = (key) => {
  const item = memoryCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return item.data;
};

const setCached = (key, data, ttlMs = DEFAULT_TTL_MS) => {
  memoryCache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
};

const invalidateCache = (pattern) => {
  if (!pattern) {
    memoryCache.clear();
    return;
  }
  for (const key of memoryCache.keys()) {
    if (key.includes(pattern)) {
      memoryCache.delete(key);
    }
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('takapay_products_updated', () => invalidateCache('produits'));
  window.addEventListener('takapay_promotions_updated', () => invalidateCache('promotions'));
}

export const handleAuthError = (res, isClient = false) => {
  if (res && (res.status === 401 || res.status === 403)) {
    if (typeof window !== 'undefined') {
      if (isClient) {
        try {
          localStorage.removeItem('takapay-client-user');
          localStorage.removeItem('takapay_client_token');
          localStorage.removeItem('takapay_backend_cagnottes');
        } catch {}
        window.dispatchEvent(
          new CustomEvent('takapay:auth:unauthorized', {
            detail: { status: res.status },
          })
        );
      } else {
        try {
          localStorage.removeItem('takapay_admin_token');
          localStorage.removeItem('takapay_admin_user');
        } catch {}
        window.dispatchEvent(
          new CustomEvent('takapay:admin:unauthorized', {
            detail: { status: res.status },
          })
        );
      }
    }
  }
};

export const broadcastUserStatusChange = (userId, status) => {
  if (typeof window === 'undefined' || !userId) return;
  const numId = Number(userId);

  try {
    const clientUserRaw = localStorage.getItem('takapay-client-user');
    if (clientUserRaw) {
      const clientUser = JSON.parse(clientUserRaw);
      if (Number(clientUser?.id) === numId) {
        if (status === 'suspendu' || status === 'inactif' || status === 'supprime') {
          localStorage.removeItem('takapay-client-user');
          localStorage.removeItem('takapay_client_token');
          localStorage.removeItem('takapay_backend_cagnottes');
        } else if (status === 'actif') {
          clientUser.statut_compte = 'actif';
          localStorage.setItem('takapay-client-user', JSON.stringify(clientUser));
        }
      }
    }

    const adminUserRaw = localStorage.getItem('takapay_admin_user');
    if (adminUserRaw) {
      const adminUser = JSON.parse(adminUserRaw);
      if (Number(adminUser?.id) === numId) {
        if (status === 'suspendu' || status === 'inactif' || status === 'supprime') {
          localStorage.removeItem('takapay_admin_token');
          localStorage.removeItem('takapay_admin_user');
        } else if (status === 'actif') {
          adminUser.statut_compte = 'actif';
          localStorage.setItem('takapay_admin_user', JSON.stringify(adminUser));
        }
      }
    }
  } catch {}

  try {
    localStorage.setItem(
      'takapay_user_status_sync',
      JSON.stringify({ userId: numId, status, timestamp: Date.now() })
    );
  } catch {}

  window.dispatchEvent(
    new CustomEvent('takapay:user_status_changed', {
      detail: { userId: numId, status, timestamp: Date.now() },
    })
  );

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('takapay_auth_channel');
      bc.postMessage({ type: 'STATUS_CHANGED', userId: numId, status, timestamp: Date.now() });
      bc.close();
    }
  } catch {}
};

const readCachedList = (key) => {
  try {
    const value = localStorage.getItem(key);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeCachedList = (key, list) => {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // Le cache reste facultatif si le stockage local est indisponible.
  }
};

const EMPTY_STATS = {
  kpis: {
    encaisse_ce_mois: 0,
    cagnottes_actives: 0,
    documents_a_valider: 0,
    nouveaux_utilisateurs: 0,
  },
  recouvrement: {
    taux: 0,
    semaines: [],
  },
  documents: [],
  derniers_versements: [],
  a_surveiller: [],
};

export const adminService = {
  getToken() {
    return localStorage.getItem('takapay_admin_token') || localStorage.getItem('takapay_client_token');
  },

  getClientToken() {
    return localStorage.getItem('takapay_client_token') || localStorage.getItem('takapay_admin_token');
  },

  getCachedProduits() {
    return readCachedList('takapay_backend_products');
  },

  invalidateCache(pattern) {
    invalidateCache(pattern);
  },

  async initiatePayment(payload) {
    const token = this.getClientToken() || this.getToken();
    const res = await fetch(`${API_BASE}/payment/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || "Erreur lors de l'initialisation du paiement FeexPay.");
    }
    if (data?.reference) {
      activeTransactionRef = data.reference;
    }
    return data;
  },

  async confirmPayment(payload) {
    const token = this.getClientToken() || this.getToken();
    const res = await fetch(`${API_BASE}/payment/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || 'Erreur lors de la confirmation du paiement.');
    }
    if (data.status === 'success') {
      window.dispatchEvent(new Event(DASHBOARD_STATS_UPDATE_EVENT));
      try {
        localStorage.setItem(DASHBOARD_STATS_UPDATE_KEY, String(Date.now()));
      } catch {
        // La mise à jour immédiate entre onglets reste facultative.
      }
    }
    return data;
  },

  async confirmOrderReception(commandeId) {
    const token = this.getClientToken() || this.getToken();
    try {
      const res = await fetch(`${API_BASE}/commandes/${commandeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ statut: 'livree' }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async confirmCagnotteReception(cagnotteId) {
    const token = this.getClientToken() || this.getToken();
    try {
      const res = await fetch(`${API_BASE}/cagnottes/${cagnotteId}/confirmer-reception`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async cancelCagnotte(cagnotteId, payload = {}) {
    try {
      const res = await fetch(`${API_BASE}/cagnottes/${cagnotteId}/annuler`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(this.getToken() ? { Authorization: `Bearer ${this.getToken()}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Erreur lors de la demande d'annulation.");
      }
      return await res.json();
    } catch (e) {
      console.error('Erreur annulation cagnotte:', e);
      throw e;
    }
  },

  async reactivateCagnotte(cagnotteId, payload = {}) {
    try {
      const token = this.getClientToken() || this.getToken();
      const res = await fetch(`${API_BASE}/cagnottes/${cagnotteId}/reactiver`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        await fetch(`${API_BASE}/cagnottes/${cagnotteId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ statut: payload.statut || 'en_cours' }),
        }).catch(() => {});
      }
      return true;
    } catch (e) {
      console.warn('Erreur réactivation cagnotte:', e);
      return false;
    }
  },

  async rembourserCagnotteFeexpay(cagnotteId, payload = {}) {
    try {
      const token = this.getToken();
      const res = await fetch(`${API_BASE}/admin/cagnottes/${cagnotteId}/rembourser-feexpay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Erreur lors du remboursement FeexPay.');
      }
      return data;
    } catch (e) {
      console.error('Erreur remboursement FeexPay:', e);
      throw e;
    }
  },

  async getNotifications(userId = null) {
    try {
      const query = userId ? `?user_id=${userId}` : '';
      const token = userId ? (this.getClientToken() || this.getToken()) : (this.getToken() || this.getClientToken());
      const res = await fetch(`${API_BASE}/notifications${query}`, {
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.data || json || [];
    } catch {
      return null;
    }
  },

  async markNotificationAsRead(notifId) {
    try {
      const token = this.getClientToken() || this.getToken();
      const res = await fetch(`${API_BASE}/notifications/${notifId}/lire`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async markAllNotificationsAsRead(userId = null) {
    try {
      const token = userId ? (this.getClientToken() || this.getToken()) : (this.getToken() || this.getClientToken());
      const res = await fetch(`${API_BASE}/notifications/tout-lire`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ user_id: userId }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async getAdminMenuCounts() {
    const token = this.getToken();
    if (!token) return { cagnottes: 0, commandes: 0 };
    try {
      const res = await fetch(`${API_BASE}/admin/notifications/menu-counts`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        handleAuthError(res, false);
        return { cagnottes: 0, commandes: 0 };
      }
      const data = await res.json();
      return {
        cagnottes: Number(data.cagnottes || 0),
        commandes: Number(data.commandes || 0),
      };
    } catch {
      return { cagnottes: 0, commandes: 0 };
    }
  },

  async markAdminMenuRead(menu) {
    const token = this.getToken();
    if (!token) return false;
    try {
      const res = await fetch(`${API_BASE}/admin/notifications/mark-menu-read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ menu }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  getUser() {
    try {
      const u = localStorage.getItem('takapay_admin_user') || localStorage.getItem('takapay-client-user');
      if (!u) return null;
      const parsed = JSON.parse(u);
      if (parsed?.statut_compte && parsed.statut_compte !== 'actif') {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  },

  async login(identifiant, password) {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        identifiant: (identifiant || '').trim(),
        password: (password || '').trim(),
        portal: 'admin',
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        data.message ||
        Object.values(data.errors || {})?.[0]?.[0] ||
        'Identifiant ou mot de passe incorrect.';
      throw new Error(msg);
    }

    if (data.access_token) {
      localStorage.setItem('takapay_admin_token', data.access_token);
    }
    if (data.user) {
      localStorage.setItem('takapay_admin_user', JSON.stringify(data.user));
    }
    return { success: true, user: data.user };
  },

  async registerClient(payload) {
    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        data.message ||
        Object.values(data.errors || {})?.[0]?.[0] ||
        'Erreur lors de la création du compte.';
      throw new Error(msg);
    }

    if (data.access_token) {
      localStorage.setItem('takapay_client_token', data.access_token);
    }
    return data;
  },

  async loginClient(identifiant, password) {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ identifiant, password, portal: 'client' }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        data.message ||
        Object.values(data.errors || {})?.[0]?.[0] ||
        'Identifiant ou code PIN incorrect.';
      const error = new Error(msg);
      error.status = res.status;
      error.locked = data.locked === true;
      error.retryAfter = Number(data.retry_after || res.headers.get('Retry-After')) || 0;
      throw error;
    }

    if (data.access_token) {
      localStorage.setItem('takapay_client_token', data.access_token);
    }
    return data;
  },

  async forgotPin(identifiant) {
    const res = await fetch(`${API_BASE}/forgot-pin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ identifiant }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        data.message ||
        Object.values(data.errors || {})?.[0]?.[0] ||
        "Impossible d'envoyer le code de réinitialisation.";
      throw new Error(msg);
    }
    return data;
  },

  async verifyPinCode(identifiant, code) {
    const res = await fetch(`${API_BASE}/verify-pin-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ identifiant, code }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        data.message ||
        Object.values(data.errors || {})?.[0]?.[0] ||
        'Code de vérification incorrect ou expiré.';
      throw new Error(msg);
    }
    return data;
  },

  async resetPin(identifiant, code, new_pin, confirm_pin) {
    const res = await fetch(`${API_BASE}/reset-pin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ identifiant, code, new_pin, confirm_pin }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        data.message ||
        Object.values(data.errors || {})?.[0]?.[0] ||
        'Échec de la réinitialisation du code PIN.';
      throw new Error(msg);
    }

    if (data.access_token) {
      localStorage.setItem('takapay_client_token', data.access_token);
    }
    return data;
  },

  async googleAuth(userData) {
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.message || 'Erreur lors de la connexion via Google.';
      throw new Error(msg);
    }

    if (data.access_token) {
      localStorage.setItem('takapay_client_token', data.access_token);
    }
    return data;
  },

  async updateProfile(payload) {
    const token = this.getClientToken() || this.getToken();
    const res = await fetch(`${API_BASE}/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    handleAuthError(res, true);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        data.message ||
        Object.values(data.errors || {})?.[0]?.[0] ||
        'Erreur lors de la mise à jour du profil.';
      throw new Error(msg);
    }
    return data;
  },

  async updatePin(payload) {
    const token = this.getClientToken() || this.getToken();
    const res = await fetch(`${API_BASE}/profile/pin`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    handleAuthError(res, true);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        data.message ||
        Object.values(data.errors || {})?.[0]?.[0] ||
        'Erreur lors de la modification du code PIN.';
      throw new Error(msg);
    }
    return data;
  },

  async getClientOrders(userId = null) {
    const token = this.getClientToken() || this.getToken();
    try {
      const url = userId ? `${API_BASE}/commandes?user_id=${encodeURIComponent(userId)}` : `${API_BASE}/commandes`;
      const res = await fetch(url, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Accept: 'application/json',
        },
      });
      handleAuthError(res, true);
      if (res.ok) {
        const json = await res.json();
        const list = json.data || json;
        if (Array.isArray(list)) {
          return list;
        }
      }
    } catch (_e) {
      void _e;
    }
    return [];
  },

  async getClientTransactions(userId = null) {
    const token = this.getClientToken() || this.getToken();
    try {
      const url = userId ? `${API_BASE}/transactions?user_id=${encodeURIComponent(userId)}` : `${API_BASE}/transactions`;
      const res = await fetch(url, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Accept: 'application/json',
        },
      });
      handleAuthError(res, true);
      if (res.ok) {
        const json = await res.json();
        const list = json.data || json;
        if (Array.isArray(list)) {
          return list;
        }
      }
    } catch (_e) {
      void _e;
    }
    return [];
  },

  // GESTION DU CARROUSEL / BANNIÈRES
  async getCarousels(all = false, force = false) {
    if (!all && !force) {
      const memoryItem = getCached('carousels_public');
      if (memoryItem) return memoryItem;
    }
    const token = this.getToken();
    const url = all ? `${API_BASE}/admin/carousels` : `${API_BASE}/carousels`;
    try {
      const res = await fetch(url, {
        headers: {
          ...(all && token ? { Authorization: `Bearer ${token}` } : {}),
          Accept: 'application/json',
        },
      });
      if (res.ok) {
        const json = await res.json();
        const list = json.data || json;
        if (Array.isArray(list)) {
          if (!all) {
            setCached('carousels_public', list);
            writeCachedList('takapay_public_carousels', list);
          }
          return list;
        }
      }
    } catch (_e) {
      void _e;
    }
    return all ? [] : (getCached('carousels_public') || readCachedList('takapay_public_carousels'));
  },

  async createCarousel(formData) {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/admin/carousels`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.message || Object.values(data.errors || {})?.[0]?.[0] || 'Erreur lors de la création de la bannière.';
      throw new Error(msg);
    }
    invalidateCache('carousels');
    try { localStorage.removeItem('takapay_public_carousels'); } catch {}
    return data;
  },

  async updateCarousel(id, formDataOrPayload) {
    const token = this.getToken();
    const isFormData = formDataOrPayload instanceof FormData;
    const url = isFormData ? `${API_BASE}/admin/carousels/${id}?_method=PUT` : `${API_BASE}/admin/carousels/${id}`;
    const headers = {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    };
    const body = isFormData ? formDataOrPayload : JSON.stringify(formDataOrPayload);

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.message || Object.values(data.errors || {})?.[0]?.[0] || 'Erreur lors de la modification de la bannière.';
      throw new Error(msg);
    }
    invalidateCache('carousels');
    try { localStorage.removeItem('takapay_public_carousels'); } catch {}
    return data;
  },

  async deleteCarousel(id) {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/admin/carousels/${id}`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.message || 'Erreur lors de la suppression de la bannière.';
      throw new Error(msg);
    }
    invalidateCache('carousels');
    try { localStorage.removeItem('takapay_public_carousels'); } catch {}
    return data;
  },

  async getPartenaires(all = false, force = false) {
    if (!all && !force) {
      const memoryItem = getCached('partenaires_public');
      if (memoryItem) return memoryItem;
    }
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/${all ? 'admin/' : ''}partenaires`, {
      headers: {
        Accept: 'application/json',
        ...(all && token ? { Authorization: 'Bearer ' + token } : {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || 'Impossible de charger les partenaires.');
    }
    const list = data.data || data;
    if (!Array.isArray(list)) {
      throw new Error('La réponse des partenaires est invalide.');
    }
    if (!all) {
      setCached('partenaires_public', list);
    }
    return list;
  },

  async createPartenaire(formData) {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/admin/partenaires`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.message || Object.values(data.errors || {})?.[0]?.[0] || 'Erreur lors de la création du partenaire.';
      throw new Error(msg);
    }
    invalidateCache('partenaires');
    return data;
  },

  async updatePartenaire(id, formDataOrPayload) {
    const token = this.getToken();
    const isFormData = formDataOrPayload instanceof FormData;
    const res = await fetch(
      isFormData ? `${API_BASE}/admin/partenaires/${id}?_method=PUT` : `${API_BASE}/admin/partenaires/${id}`,
      {
        method: isFormData ? 'POST' : 'PUT',
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
          ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
        },
        body: isFormData ? formDataOrPayload : JSON.stringify(formDataOrPayload),
      },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.message || Object.values(data.errors || {})?.[0]?.[0] || 'Erreur lors de la modification du partenaire.';
      throw new Error(msg);
    }
    invalidateCache('partenaires');
    return data;
  },

  async deletePartenaire(id) {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/admin/partenaires/${id}`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || 'Erreur lors de la suppression du partenaire.');
    }
    invalidateCache('partenaires');
    return data;
  },

  logout() {
    try {
      const token = this.getToken();
      if (token) {
        fetch(`${API_BASE}/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }).catch(() => {});
      }
    } finally {
      localStorage.removeItem('takapay_admin_token');
      localStorage.removeItem('takapay_admin_user');
    }
  },

  logoutClient() {
    try {
      const token = this.getClientToken();
      if (token) {
        fetch(`${API_BASE}/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }).catch(() => {});
      }
    } finally {
      localStorage.removeItem('takapay-client-user');
      localStorage.removeItem('takapay_client_token');
      localStorage.removeItem('takapay_backend_cagnottes');
    }
  },

  async getDashboardStats() {
    const token = this.getToken();
    if (!token) {
      throw new Error('Session administrateur expirée. Veuillez vous reconnecter.');
    }
    const res = await fetch(`${API_BASE}/admin/stats`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      handleAuthError(res, false);
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || `Impossible de charger les statistiques (${res.status}).`);
    }
    const data = await res.json();

    return {
      ...EMPTY_STATS,
      ...data,
    };
  },

  // 1. GESTION DES PRODUITS
  getCustomProducts() {
    try {
      const saved = localStorage.getItem('takapay_created_products');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  },

  async uploadVideo(file) {
    const token = this.getToken();
    try {
      const formData = new FormData();
      formData.append('video', file);
      const res = await fetch(`${API_BASE}/admin/upload-video`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Accept: 'application/json',
        },
        body: formData,
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Erreur téléversement vidéo direct:', e);
    }
    return null;
  },

  saveCustomProduct(product) {
    try {
      const safeProduct = { ...product };
      if (
        safeProduct.video &&
        typeof safeProduct.video === 'object' &&
        safeProduct.video.chemin?.startsWith('data:video/')
      ) {
        safeProduct.video = { ...safeProduct.video, chemin: '' };
      } else if (
        typeof safeProduct.video === 'string' &&
        safeProduct.video.startsWith('data:video/')
      ) {
        safeProduct.video = null;
      }
      const existing = this.getCustomProducts();
      const filtered = existing.filter((p) => p.id !== product.id);
      const updated = [safeProduct, ...filtered];
      localStorage.setItem('takapay_created_products', JSON.stringify(updated));
      window.dispatchEvent(
        new CustomEvent('takapay_products_updated', { detail: product })
      );
      return updated;
    } catch {
      return [];
    }
  },

  async getProduits(force = false) {
    if (!force) {
      const memoryItem = getCached('produits');
      if (memoryItem) return memoryItem;
    }
    const token = this.getToken();
    try {
      const res = await fetch(`${API_BASE}/produits`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Accept: 'application/json',
        },
      });
      if (res.ok) {
        const json = await res.json();
        const list = json.data || json;
        if (Array.isArray(list)) {
          const lastPage = Number(json.meta?.last_page) || 1;
          const remainingPages = await Promise.all(
            Array.from({ length: Math.max(0, lastPage - 1) }, async (_, index) => {
              const pageRes = await fetch(`${API_BASE}/produits?page=${index + 2}`, {
                headers: { Accept: 'application/json' },
              });
              if (!pageRes.ok) {
                throw new Error(`Impossible de charger les produits (${pageRes.status}).`);
              }

              const pageJson = await pageRes.json();
              const pageList = pageJson.data || pageJson;
              if (!Array.isArray(pageList)) {
                throw new Error('Réponse invalide lors du chargement des produits.');
              }
              return pageList;
            })
          );
          const allProducts = [...list, ...remainingPages.flat()];
          setCached('produits', allProducts);
          writeCachedList('takapay_backend_products', allProducts);
          return allProducts;
        }
      }
    } catch {
      // Fallback
    }
    return getCached('produits') || readCachedList('takapay_backend_products');
  },

  async getAdminProduits() {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/admin/produits`, {
      headers: {
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        Accept: 'application/json',
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || `Impossible de charger les produits (${res.status}).`);
    }
    const produits = data.data || data;
    if (!Array.isArray(produits)) {
      throw new Error('Réponse invalide lors du chargement des produits administrateur.');
    }
    return produits;
  },

  async deleteProduit(produitId) {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/produits/${produitId}`, {
      method: 'DELETE',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const error = new Error(
        err.message || 'Erreur lors de la suppression du produit.'
      );
      error.data = err;
      error.status = res.status;
      throw error;
    }
    invalidateCache('produits');
    window.dispatchEvent(new CustomEvent('takapay_products_updated'));
    return true;
  },

  async createProduit(payload) {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/admin/produits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[adminService.createProduit Error]', err);
      let errMsg = err.message || "Erreur lors de l'enregistrement du produit en base de données.";
      if (err.errors) {
        const errorList = Object.entries(err.errors)
          .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
          .join('\n');
        errMsg = `${errMsg}\n\n${errorList}`;
      }
      const customErr = new Error(errMsg);
      customErr.status = res.status;
      customErr.errors = err.errors;
      throw customErr;
    }
    const data = await res.json();
    const created = data.data || data;
    if (payload.video) {
      created.video = payload.video;
    }
    invalidateCache('produits');
    window.dispatchEvent(
      new CustomEvent('takapay_products_updated', { detail: created })
    );
    return { success: true, data: created };
  },

  async updateProduit(id, payload) {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/produits/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Erreur lors de la mise à jour du produit.');
    }
    const data = await res.json();
    const updated = data.data || data;
    if (payload.video) {
      updated.video = payload.video;
    }
    invalidateCache('produits');
    window.dispatchEvent(
      new CustomEvent('takapay_products_updated', { detail: updated })
    );
    return { success: true, data: updated };
  },

  async getCategories(force = false) {
    if (!force) {
      const memoryItem = getCached('categories');
      if (memoryItem) return memoryItem;
    }
    try {
      const res = await fetch(`${API_BASE}/categories`, {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const json = await res.json();
        const apiList = json.data || json;
        if (Array.isArray(apiList)) {
          setCached('categories', apiList);
          writeCachedList('takapay_backend_categories', apiList);
          return apiList;
        }
      }
    } catch (_error) {
      void _error;
    }

    return getCached('categories') || readCachedList('takapay_backend_categories');
  },

  async getAdminCategories() {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/admin/categories`, {
      headers: {
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        Accept: 'application/json',
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || `Impossible de charger les catégories (${res.status}).`);
    }
    const categories = data.data || data;
    if (!Array.isArray(categories)) {
      throw new Error('Réponse invalide lors du chargement des catégories administrateur.');
    }
    return categories;
  },

  async createCategorie(payload) {
    const token = this.getToken();
    if (!token) {
      throw new Error("Session expirée. Veuillez vous reconnecter en tant qu'administrateur.");
    }
    const res = await fetch(`${API_BASE}/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = (err.errors && Object.values(err.errors).flat().join(' ')) || err.message || 'Erreur lors de la création de la catégorie.';
      const error = new Error(msg);
      error.status = res.status;
      error.errors = err.errors;
      error.data = err;
      throw error;
    }

    const json = await res.json();
    const created = json.data || json;
    invalidateCache('categories');
    window.dispatchEvent(
      new CustomEvent('takapay_categories_updated', { detail: created })
    );
    return { success: true, data: created };
  },

  async updateCategorie(id, payload) {
    const token = this.getToken();
    if (!token) {
      throw new Error("Session expirée. Veuillez vous reconnecter en tant qu'administrateur.");
    }

    const res = await fetch(`${API_BASE}/categories/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const response = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = new Error(
        (response.errors && Object.values(response.errors).flat().join(' ')) ||
          response.message ||
          'Erreur lors de la modification de la catégorie.'
      );
      error.status = res.status;
      error.errors = response.errors;
      error.data = response;
      throw error;
    }

    const updated = response.data || response;
    invalidateCache('categories');
    window.dispatchEvent(
      new CustomEvent('takapay_categories_updated', { detail: updated })
    );
    return { success: true, data: updated };
  },

  async getSousCategories() {
    try {
      const res = await fetch(`${API_BASE}/sous-categories`, {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const json = await res.json();
        const list = json.data || json;
        if (Array.isArray(list)) {
          return list;
        }
      }
    } catch (_error) {
      void _error;
    }
    return [];
  },

  async getAdminSousCategories() {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/admin/sous-categories`, {
      headers: {
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        Accept: 'application/json',
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || `Impossible de charger les sous-catégories (${res.status}).`);
    }
    const sousCategories = data.data || data;
    if (!Array.isArray(sousCategories)) {
      throw new Error('Réponse invalide lors du chargement des sous-catégories administrateur.');
    }
    return sousCategories;
  },

  async createSousCategorie(payload) {
    const token = this.getToken();
    if (!token) {
      throw new Error("Session expirée. Veuillez vous reconnecter en tant qu'administrateur.");
    }
    const res = await fetch(`${API_BASE}/sous-categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = (err.errors && Object.values(err.errors).flat().join(' ')) || err.message || 'Erreur lors de la création de la sous-catégorie.';
      const error = new Error(msg);
      error.status = res.status;
      error.errors = err.errors;
      error.data = err;
      throw error;
    }

    const json = await res.json();
    const created = json.data || json;
    window.dispatchEvent(
      new CustomEvent('takapay_categories_updated', { detail: created })
    );
    return { success: true, data: created };
  },

  async updateSousCategorie(id, payload) {
    const token = this.getToken();
    if (!token) {
      throw new Error("Session expirée. Veuillez vous reconnecter en tant qu'administrateur.");
    }

    const res = await fetch(`${API_BASE}/sous-categories/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const response = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = new Error(
        (response.errors && Object.values(response.errors).flat().join(' ')) ||
          response.message ||
          'Erreur lors de la modification de la sous-catégorie.'
      );
      error.status = res.status;
      error.errors = response.errors;
      error.data = response;
      throw error;
    }

    const updated = response.data || response;
    window.dispatchEvent(
      new CustomEvent('takapay_categories_updated', { detail: updated })
    );
    return { success: true, data: updated };
  },

  async deleteCategorie(id) {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/categories/${id}`, {
      method: 'DELETE',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const error = new Error(err.message || 'Erreur lors de la suppression de la catégorie.');
      error.status = res.status;
      error.data = err;
      throw error;
    }

    const json = await res.json().catch(() => ({}));
    invalidateCache('categories');
    window.dispatchEvent(new CustomEvent('takapay_categories_updated', { detail: { id, deleted: true } }));
    return { success: true, ...json };
  },

  async deleteSousCategorie(id) {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/sous-categories/${id}`, {
      method: 'DELETE',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const error = new Error(err.message || 'Erreur lors de la suppression de la sous-catégorie.');
      error.status = res.status;
      error.data = err;
      throw error;
    }

    const json = await res.json().catch(() => ({}));
    invalidateCache('categories');
    window.dispatchEvent(new CustomEvent('takapay_categories_updated', { detail: { id, deleted: true } }));
    return { success: true, ...json };
  },

  async getPromotions(force = false) {
    if (!force) {
      const memoryItem = getCached('promotions');
      if (memoryItem) return memoryItem;
    }
    const token = this.getToken();
    try {
      const res = await fetch(`${API_BASE}/promotions`, {
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const json = await res.json();
        const list = json.data || json;
        if (Array.isArray(list)) {
          setCached('promotions', list);
          return list;
        }
      }
    } catch (_error) {
      void _error;
    }
    return getCached('promotions') || [];
  },

  async createPromotion(payload) {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/promotions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.message || Object.values(data.errors || {})?.[0]?.[0] || 'Erreur lors de la création de la promotion.';
      throw new Error(msg);
    }
    invalidateCache('promotions');
    window.dispatchEvent(new CustomEvent('takapay_promotions_updated'));
    return { success: true, data: data.data || data };
  },

  async updatePromotion(promoId, payload) {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/promotions/${promoId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.message || Object.values(data.errors || {})?.[0]?.[0] || 'Erreur lors de la modification de la promotion.';
      throw new Error(msg);
    }
    invalidateCache('promotions');
    window.dispatchEvent(new CustomEvent('takapay_promotions_updated'));
    return { success: true, data: data.data || data };
  },

  async deletePromotion(promoId) {
    const token = this.getToken();
    try {
      await fetch(`${API_BASE}/promotions/${promoId}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Accept: 'application/json',
        },
      });
    } catch (_error) {
      void _error;
    }
    invalidateCache('promotions');
    window.dispatchEvent(new CustomEvent('takapay_promotions_updated'));
    return true;
  },

  // 2. GESTION DES CAGNOTTES
  async getCagnottes(userId = null) {
    if (!userId) {
      // Espace Administration : endpoint dédié sécurisé avec visibilité super_admin / admin
      const adminToken = this.getToken();
      try {
        const res = await fetch(`${API_BASE}/admin/cagnottes`, {
          headers: {
            ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
            Accept: 'application/json',
          },
        });
        if (res.status === 401 || res.status === 403) {
          handleAuthError(res, false);
          return [];
        }
        if (res.ok) {
          const json = await res.json();
          const list = json.data || json;
          if (Array.isArray(list)) {
            return list;
          }
        }
      } catch (_error) {
        void _error;
      }
    }

    // Espace Client (avec userId explicite) ou fallback
    const token = userId ? (this.getClientToken() || this.getToken()) : this.getToken();
    try {
      const url = userId ? `${API_BASE}/cagnottes?user_id=${encodeURIComponent(userId)}` : `${API_BASE}/cagnottes`;
      const res = await fetch(url, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Accept: 'application/json',
        },
      });
      if (res.status === 401 || res.status === 403) {
        handleAuthError(res, Boolean(userId));
        return null;
      }
      if (res.ok) {
        const json = await res.json();
        const list = json.data || json;
        if (Array.isArray(list)) {
          return list;
        }
      }
    } catch (_error) {
      void _error;
    }
    return null;
  },

  async deleteUnpaidCagnotte(cagnotteId) {
    const token = this.getClientToken();
    const res = await fetch(`${API_BASE}/cagnottes/${cagnotteId}/non-payee`, {
      method: 'DELETE',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        Accept: 'application/json',
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || 'Impossible de supprimer cette cagnotte.');
    }
    return data;
  },

  // 3. GESTION DES DOCUMENTS KYC
  async getDocuments() {
    const token = this.getToken();
    try {
      const res = await fetch(`${API_BASE}/documents`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Accept: 'application/json',
        },
      });
      if (res.ok) {
        const json = await res.json();
        const list = json.data || json;
        if (Array.isArray(list)) {
          return list;
        }
      }
    } catch (_error) {
      void _error;
    }
    return [];
  },

  async verifyDocument(documentId, status, motif = null) {
    const token = this.getToken();
    if (!token) {
      return false;
    }
    try {
      await fetch(`${API_BASE}/admin/documents/${documentId}/verify`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        body: JSON.stringify({
          statut: status ? 'valide' : 'refuse',
          motif: motif,
        }),
      });
    } catch (_error) {
      void _error;
    }
    return true;
  },

  // 4. GESTION DES UTILISATEURS
  async getUsers(page = 1, filters = {}) {
    let p = 1;
    let opts = {};
    if (typeof page === 'object' && page !== null) {
      opts = page;
      p = opts.page || 1;
    } else {
      p = page || 1;
      opts = filters || {};
    }

    const token = this.getToken();
    const params = new URLSearchParams();
    params.set('page', p);
    if (opts.q) params.set('q', opts.q);
    if (opts.role && opts.role !== 'tous') params.set('role', opts.role);

    try {
      const res = await fetch(`${API_BASE}/users?${params.toString()}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Accept: 'application/json',
        },
      });
      if (res.ok) {
        const json = await res.json();
        const list = json.data || (Array.isArray(json) ? json : []);
        return {
          data: Array.isArray(list) ? list : [],
          counts: json.counts || null,
          meta: json.meta || {
            current_page: p,
            last_page: 1,
            total: Array.isArray(list) ? list.length : 0,
            per_page: 15,
          },
        };
      }
    } catch (_error) {
      void _error;
    }
    return {
      data: [],
      counts: null,
      meta: { current_page: 1, last_page: 1, total: 0, per_page: 15 },
    };
  },

  async updateUserStatus(userId, status) {
    const token = this.getToken();
    if (!token) {
      return false;
    }
    const res = await fetch(`${API_BASE}/admin/users/${userId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      body: JSON.stringify({ statut_compte: status }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Erreur lors du changement de statut');
    }
    broadcastUserStatusChange(userId, status);
    return true;
  },

  async createUser(payload) {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.message || Object.values(data.errors || {})[0]?.[0] || "Erreur lors de la création de l'utilisateur.";
      throw new Error(msg);
    }
    return data;
  },

  async updateUser(userId, payload) {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.message || Object.values(data.errors || {})[0]?.[0] || "Erreur lors de la modification de l'utilisateur.";
      throw new Error(msg);
    }
    if (payload.statut_compte) {
      broadcastUserStatusChange(userId, payload.statut_compte);
    }
    return data;
  },

  async deleteUser(userId) {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/users/${userId}`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.message || "Erreur lors de la suppression de l'utilisateur.";
      throw new Error(msg);
    }
    broadcastUserStatusChange(userId, 'supprime');
    return data;
  },

  async updatePassword(payload) {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/profile/password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.message || Object.values(data.errors || {})[0]?.[0] || 'Erreur lors de la mise à jour du mot de passe.';
      throw new Error(msg);
    }
    return data;
  },

  // 5. GESTION DES TRANSACTIONS
  async getTransactions() {
    const token = this.getToken();
    try {
      const res = await fetch(`${API_BASE}/transactions`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Accept: 'application/json',
        },
      });
      if (res.ok) {
        const json = await res.json();
        const list = json.data || json;
        if (Array.isArray(list)) {
          return list;
        }
      }
    } catch (_error) {
      void _error;
    }
    return [];
  },

  // 6. GESTION DES LIVRAISONS
  async getLivraisons() {
    const token = this.getToken();
    try {
      const res = await fetch(`${API_BASE}/livraisons`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Accept: 'application/json',
        },
      });
      if (res.ok) {
        const json = await res.json();
        const list = json.data || json;
        if (Array.isArray(list)) {
          return list;
        }
      }
    } catch (_error) {
      void _error;
    }
    return [];
  },

  // 7. SUPPORT CLIENTÈLE & CHAT EN DIRECT
  async getSupportUnreadCount() {
    const token = this.getToken();
    try {
      const res = await fetch(`${API_BASE}/admin/support/unread-count`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Accept: 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        return data.unread_count || 0;
      }
    } catch {
      /* ignore */
    }
    return 0;
  },

  async getSupportConversations(page = 1) {
    const token = this.getToken();
    try {
      const res = await fetch(
        `${API_BASE}/admin/support/conversations?page=${page}`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            Accept: 'application/json',
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        return data.data || { data: [] };
      }
    } catch {
      /* ignore */
    }
    return { data: [] };
  },

  async getSupportConversation(id) {
    const token = this.getToken();
    try {
      const res = await fetch(
        `${API_BASE}/admin/support/conversations/${id}`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            Accept: 'application/json',
          },
        }
      );
      if (res.ok) {
        return await res.json();
      }
    } catch {
      /* ignore */
    }
    return null;
  },

  async replySupportConversation(id, message) {
    const token = this.getToken();
    const res = await fetch(
      `${API_BASE}/admin/support/conversations/${id}/reply`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message }),
      }
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || "Erreur lors de l'envoi de la réponse.");
    }
    return await res.json();
  },

  async closeSupportConversation(id) {
    const token = this.getToken();
    const res = await fetch(
      `${API_BASE}/admin/support/conversations/${id}/close`,
      {
        method: 'PATCH',
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    );
    if (!res.ok) {
      throw new Error('Erreur lors de la clôture de la conversation.');
    }
    return await res.json();
  },
  // 8. GESTION DES COMMANDES DES CAGNOTTES
 async getCommandes(filters = {}) {
  const token = this.getToken();
  if (!token) return { data: [], meta: { current_page: 1, last_page: 1, total: 0 } };

  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.statut) params.set('statut', filters.statut);
  if (filters.page) params.set('page', filters.page);

  try {
    const res = await fetch(`${API_BASE}/admin/commandes?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    if (res.ok) {
      const json = await res.json();
      return {
        data: Array.isArray(json.data) ? json.data : [],
        meta: json.meta || { current_page: 1, last_page: 1, total: 0 },
      };
    }
  } catch (_error) {
    void _error;
  }
  return { data: [], meta: { current_page: 1, last_page: 1, total: 0 } };
},

  async getCagnotteOrders(cagnotteId = null) {
    const token = this.getToken();
    if (!token) return [];
    const url = cagnotteId
      ? `${API_BASE}/admin/cagnottes/${cagnotteId}/commandes`
      : `${API_BASE}/admin/cagnottes/commandes`;
    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      if (res.ok) {
        const json = await res.json();
        const list = json.data || json;
        if (Array.isArray(list)) {
          return list;
        }
      }
    } catch (_error) {
      void _error;
    }
    return [];
  },

  async updateCommandeStatut(commandeId, statut) {
    const token = this.getToken();
    if (!token) return false;
    try {
      const res = await fetch(
        `${API_BASE}/admin/commandes/${commandeId}/statut`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
          body: JSON.stringify({ statut }),
        }
      );
      return res.ok;
    } catch (_error) {
      void _error;
      return false;
    }
  },
};

// --- FeexPay Watchdog : Arrêt de la rotation après 30s ou annulation ---
let isWatchdogInitialized = false;
let currentWatchdogCallback = null;
let watchdogPaymentTimer = null;
let watchdogFastPoll = null;
let isPaymentCancelled = false;
let paymentStartTime = 0;
let activeTransactionRef = null;

export const cancelFeexpayPayment = (reason = 'CANCELLED', wasSubmitted = null, reference = null) => {
  const refToCancel = reference || activeTransactionRef;
  if (refToCancel) {
    const token = adminService.getClientToken() || adminService.getToken();
    try {
      fetch(`${API_BASE}/payment/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ reference: refToCancel }),
      }).catch(() => {});
    } catch {}
  }
  const hadStarted = wasSubmitted !== null ? wasSubmitted : (paymentStartTime > 0);
  isPaymentCancelled = true;
  if (watchdogPaymentTimer) {
    clearTimeout(watchdogPaymentTimer);
    watchdogPaymentTimer = null;
  }
  if (watchdogFastPoll) {
    clearInterval(watchdogFastPoll);
    watchdogFastPoll = null;
  }
  paymentStartTime = 0;
  activeTransactionRef = null;

  if (typeof currentWatchdogCallback === 'function') {
    try {
      currentWatchdogCallback({
        status: 'FAILED',
        reason,
        hadStarted,
        message: reason === 'TIMEOUT'
          ? 'Le délai de validation sur votre téléphone a expiré (120 secondes).'
          : 'La transaction a été annulée.'
      });
    } catch (e) {
      console.warn('Watchdog callback error:', e);
    }
  }

  // Fermeture forcée des modales FeexPay résiduelles pour stopper immédiatement tout spinner
  if (typeof document !== 'undefined') {
    setTimeout(() => {
      document.querySelectorAll('div.fixed.inset-0.z-50').forEach((el) => {
        if (
          el.textContent.includes('FeexPay') ||
          el.querySelector('img[src*="logo"]') ||
          el.textContent.includes('Remplissez les champs') ||
          el.textContent.includes('Traitement en cours')
        ) {
          el.remove();
        }
      });
    }, 40);
  }
};

export const registerFeexpayWatchdog = (callback) => {
  currentWatchdogCallback = callback;
  if (isWatchdogInitialized) {
    return () => {
      if (currentWatchdogCallback === callback) {
        currentWatchdogCallback = null;
      }
    };
  }
  isWatchdogInitialized = true;

  if (typeof window === 'undefined') return () => {};

  const originalFetch = window.fetch;

  window.fetch = async function (...args) {
    const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');

    // 1. Déclenchement de la demande de paiement FeexPay
    if (url.includes('/api/transactions/requesttopay/integration')) {
      if (args[1] && typeof args[1].body === 'string' && window.__takapaySelectedNetwork) {
        try {
          const bodyObj = JSON.parse(args[1].body);
          const net = window.__takapaySelectedNetwork;
          bodyObj.reseau = net === 'CELTIIS' ? 'CELTIIS BJ' : net;
          if (bodyObj.description) {
            bodyObj.description = String(bodyObj.description).replace(/[^a-zA-Z0-9 ]/g, '');
          }
          args[1] = { ...args[1], body: JSON.stringify(bodyObj) };
        } catch { /* ignore */ }
      }
      isPaymentCancelled = false;
      paymentStartTime = Date.now();
      if (watchdogPaymentTimer) clearTimeout(watchdogPaymentTimer);
      if (watchdogFastPoll) clearInterval(watchdogFastPoll);

      // Délai de 120 secondes : laisse le temps réel au client de valider le code USSD sur son téléphone
      watchdogPaymentTimer = setTimeout(() => {
        console.warn('[Takapay] ⏱️ 120s écoulées sans validation : arrêt de la rotation.');
        cancelFeexpayPayment('TIMEOUT', true);
      }, 120000);

      try {
        const res = await originalFetch.apply(this, args);
        const clone = res.clone();
        clone.json().then((data) => {
          if (data?.reference) {
            activeTransactionRef = data.reference;
          } else if (data?.statusCode === '92' || data?.status === 'FAILED') {
            cancelFeexpayPayment('CANCELLED', true);
          }
        }).catch(() => {});
        return res;
      } catch (err) {
        cancelFeexpayPayment('CANCELLED', true);
        throw err;
      }
    }

    // 2. Interception du polling FeexPay pour stopper son spinner après 120s
    if (url.includes('/api/transactions/getrequesttopay/integration/') || url.includes('/api/transactions/public/single/status/')) {
      const elapsed = Date.now() - paymentStartTime;
      if (paymentStartTime > 0 && elapsed >= 120000) {
        return new Response(JSON.stringify({
          status: 'FAILED',
          reason: 'TIMEOUT',
          message: 'Délai de paiement de 120 secondes dépassé.'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const res = await originalFetch.apply(this, args);
      try {
        const clone = res.clone();
        clone.json().then((pollData) => {
          const st = pollData?.status?.toUpperCase();
          if (st === 'FAILED' || st === 'CANCELLED' || pollData?.reason?.includes('CANCEL')) {
            cancelFeexpayPayment('CANCELLED', true);
          } else if (st === 'SUCCESSFUL' || st === 'SUCCESS') {
            if (watchdogPaymentTimer) clearTimeout(watchdogPaymentTimer);
            if (watchdogFastPoll) clearInterval(watchdogFastPoll);
          }
        }).catch(() => {});
      } catch { /* ignore */ }
      return res;
    }

    return originalFetch.apply(this, args);
  };

  // 3. Écoute des clics sur "Retour" ou "Fermer (X)" dans la fenêtre FeexPay
  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!target) return;
    const btn = target.closest('button');
    if (!btn) return;

    const isRetour = btn.textContent?.trim() === 'Retour' && btn.closest('.fixed.inset-0.z-50');
    const isClose = (btn.getAttribute('aria-label') === 'Fermer la passerelle de paiement') ||
                    (btn.closest('.fixed.inset-0.z-50') && btn.querySelector('path[d*="M6 18L18 6"]'));
    if (isRetour || isClose) {
      console.log('[Takapay] Annulation détectée (clic Retour/Fermer FeexPay).');
      cancelFeexpayPayment('CANCELLED');
    }
  }, true);

  // 4. Personnalisation de la modale FeexPay : suppression Carte Bancaire / Wallet et sélection directe MTN, MOOV, CELTIS
  const customizeFeexpayModal = () => {
    document.querySelectorAll('div.fixed.inset-0.z-50').forEach((modal) => {
      // Remplacement du logo FeexPay par Takapay
      modal.querySelectorAll('img[src*="feexpay_logo"], img[alt="Logo"]').forEach((img) => {
        if (!img.dataset.takapayLogo) {
          img.src = '/logo.png';
          img.alt = 'Takapay';
          img.style.maxHeight = '38px';
          img.style.width = 'auto';
          img.style.objectFit = 'contain';
          img.dataset.takapayLogo = 'true';
        }
      });

      // Retirer "MARCHAND: Takapay Store ID : 4HgUAuyVdYvnMPc" pour ne laisser que le logo Takapay
      modal.querySelectorAll('div.border-b div.text-right, div.border-b.border-gray-200 div.text-right').forEach((el) => {
        el.style.display = 'none';
      });

      // Injection et affichage en lecture seule du montant validé
      const formBody = modal.querySelector('div.overflow-y-auto');
      if (formBody) {
        const curAmount = window.__takapayCurrentDepositAmount || 10000;
        const formattedAmount = `${Number(curAmount).toLocaleString('fr-FR')} FCFA`;

        let existingInput = formBody.querySelector('[data-takapay-amount-input]');
        if (existingInput) {
          if (existingInput.value !== formattedAmount) {
            existingInput.value = formattedAmount;
          }
        } else if (!formBody.querySelector('[data-takapay-amount-box]')) {
          const amountBox = document.createElement('div');
          amountBox.dataset.takapayAmountBox = 'true';
          amountBox.style.cssText = 'background: #f8fafc; padding: 12px 14px; border-radius: 14px; border: 1.5px solid #fed7aa; margin-bottom: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.03);';
          
          amountBox.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <label style="display: block; font-size: 12.5px; font-weight: 800; color: #1e293b;">
                Montant validé à régler :
              </label>
              <span style="font-size: 11px; font-weight: 700; color: #16a34a; background: #dcfce7; padding: 2px 8px; border-radius: 6px;">Verrouillé</span>
            </div>
            <div style="position: relative; display: flex; align-items: center;">
              <input
                type="text"
                readonly
                value="${formattedAmount}"
                data-takapay-amount-input="true"
                style="width: 100%; padding: 10px 56px 10px 14px; border: 1.5px solid #fed7aa; border-radius: 10px; font-size: 16px; font-weight: 800; color: #0f172a; outline: none; background: #ffffff; box-sizing: border-box; cursor: not-allowed;"
              />
              <span style="position: absolute; right: 12px; font-size: 12px; font-weight: 800; color: #ea580c; pointer-events: none;">FCFA</span>
            </div>
          `;

          formBody.insertBefore(amountBox, formBody.firstChild);
        }

        // Masquer le texte d'origine "Vous allez payer X OF" pour un affichage épuré
        formBody.querySelectorAll('p.text-sm.text-gray-600.text-center.mb-4, h2.font-bold.text-center').forEach((el) => {
          el.style.display = 'none';
        });

        // Mettre à jour les récapitulatifs dans la modale FeexPay
        const recapBox = modal.querySelector('div.bg-gray-50.p-4.rounded-md');
        if (recapBox) {
          const rows = recapBox.querySelectorAll('div.flex.justify-between');
          if (rows.length >= 1) {
            const amountSpan = rows[0].querySelector('span.font-medium, span:last-child');
            if (amountSpan) amountSpan.textContent = `${Number(curAmount).toLocaleString('fr-FR')} XOF`;
          }
          if (rows.length >= 3) {
            const totalSpan = rows[2].querySelector('span:last-child');
            if (totalSpan) totalSpan.textContent = `${Number(curAmount).toLocaleString('fr-FR')} XOF`;
          }
        }

        // Mettre à jour le texte du bouton Payer
        modal.querySelectorAll('button').forEach((btn) => {
          if (btn.textContent.includes('Payer')) {
            btn.textContent = `Payer ${Number(curAmount).toLocaleString('fr-FR')} XOF`;
          }
        });
      }

      // Remplacement de Mobile Money / Carte Bancaire / Wallet par MTN / MOOV / CELTIS
      const allTabBars = Array.from(modal.querySelectorAll('div.flex.justify-center.mb-6.border-b.pb-4, [data-takapay-networks="true"]'));
      const tabsContainer = allTabBars[0];

      const applyNetworkSelection = (netValue) => {
        window.__takapaySelectedNetwork = netValue;
        const displayLabel = netValue === 'CELTIIS' ? 'CELTIS' : netValue;

        modal.querySelectorAll('select').forEach((sel) => {
          const hasOption = Array.from(sel.options || []).some((opt) => opt.value === netValue);
          if (hasOption && sel.value !== netValue) {
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')?.set;
            if (nativeSetter) {
              nativeSetter.call(sel, netValue);
            } else {
              sel.value = netValue;
            }
            sel.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });

        modal.querySelectorAll('[data-takapay-network-display]').forEach((el) => {
          el.textContent = displayLabel;
        });

        if (tabsContainer) {
          Array.from(tabsContainer.children).forEach((card) => {
            const cardNet = card.dataset.netValue || (card.textContent.includes('MOOV') ? 'MOOV' : card.textContent.includes('CELTIS') ? 'CELTIIS' : 'MTN');
            card.dataset.netValue = cardNet;
            const isSelected = cardNet === netValue;
            card.className = `flex flex-col items-center justify-center flex-1 px-4 py-2 cursor-pointer rounded border ${
              isSelected ? 'bg-[#fff7ed] border-[#D45D00] border-2' : 'bg-white border-[#D45D00]'
            }`;
          });
        }
      };

      if (tabsContainer && !tabsContainer.dataset.takapayBound) {
        tabsContainer.dataset.takapayBound = 'true';
        if (tabsContainer.textContent.includes('Carte Bancaire') || tabsContainer.textContent.includes('Wallet')) {
          const mobileTab = Array.from(tabsContainer.children).find((c) => c.textContent.includes('Mobile Money'));
          if (mobileTab) {
            try { mobileTab.click(); } catch {}
          }

          tabsContainer.dataset.takapayNetworks = 'true';
          tabsContainer.className = 'flex justify-center mb-6 border-b pb-4 w-full gap-3';
          tabsContainer.replaceChildren();

          const networks = [
            { label: 'MTN', value: 'MTN', logo: '/assets/mtn logo.png' },
            { label: 'MOOV', value: 'MOOV', logo: '/assets/logo moov.png' },
            { label: 'CELTIS', value: 'CELTIIS', logo: '/assets/logo celtis.jpeg' },
          ];

          const initialNet = window.__takapaySelectedNetwork || 'MTN';
          networks.forEach((net) => {
            const isSelected = initialNet === net.value;
            const card = document.createElement('div');
            card.dataset.netValue = net.value;
            card.className = `flex flex-col items-center justify-center flex-1 px-4 py-2 cursor-pointer rounded border ${
              isSelected ? 'bg-[#fff7ed] border-[#D45D00] border-2' : 'bg-white border-[#D45D00]'
            }`;

            const imgContainer = document.createElement('div');
            imgContainer.className = 'w-12 h-8 flex items-center justify-center mb-1';
            const img = document.createElement('img');
            img.src = net.logo;
            img.alt = net.label;
            img.style.maxHeight = '28px';
            img.style.maxWidth = '44px';
            img.style.objectFit = 'contain';
            imgContainer.appendChild(img);

            const labelSpan = document.createElement('span');
            labelSpan.className = 'text-xs font-bold';
            labelSpan.textContent = net.label;

            card.appendChild(imgContainer);
            card.appendChild(labelSpan);
            tabsContainer.appendChild(card);
          });
        }

        Array.from(tabsContainer.children).forEach((card) => {
          const cardNet = card.dataset.netValue || (card.textContent.includes('MOOV') ? 'MOOV' : card.textContent.includes('CELTIS') ? 'CELTIIS' : 'MTN');
          card.dataset.netValue = cardNet;
          card.addEventListener('click', () => applyNetworkSelection(cardNet));
        });
      }

      // Remplacer tout <select> de réseau (MTN/MOOV/CELTIIS) par l'affichage statique du nom du réseau choisi
      modal.querySelectorAll('select').forEach((sel) => {
        const isNetworkSelect = Array.from(sel.options || []).some((opt) => opt.value === 'MTN');
        if (isNetworkSelect) {
          const wrapper = sel.parentElement;
          if (wrapper) {
            sel.style.display = 'none';
            const arrow = wrapper.querySelector('div.pointer-events-none');
            if (arrow) arrow.style.display = 'none';
            let labelBox = wrapper.querySelector('[data-takapay-network-display]');
            if (!labelBox) {
              labelBox = document.createElement('div');
              labelBox.dataset.takapayNetworkDisplay = 'true';
              labelBox.className = 'block w-full px-3 py-2 border rounded-md bg-gray-50 font-bold text-gray-800 text-xs flex items-center';
              wrapper.appendChild(labelBox);
            }
            const cur = window.__takapaySelectedNetwork || sel.value || 'MTN';
            const expectedText = cur === 'CELTIIS' ? 'CELTIS' : cur;
            if (labelBox.textContent !== expectedText) {
              labelBox.textContent = expectedText;
            }
          }
        }
      });
    });
  };

  let customizeRaf = null;
  let isCustomizing = false;

  const scheduleCustomize = () => {
    if (customizeRaf || isCustomizing) return;
    customizeRaf = requestAnimationFrame(() => {
      customizeRaf = null;
      if (isCustomizing) return;
      isCustomizing = true;
      try {
        customizeFeexpayModal();
      } finally {
        isCustomizing = false;
      }
    });
  };

  const modalObs = new MutationObserver((mutations) => {
    if (isCustomizing) return;
    const hasModal = mutations.some((m) =>
      m.addedNodes.length > 0 &&
      Array.from(m.addedNodes).some(
        (n) => n.nodeType === 1 && (n.classList?.contains('fixed') || n.querySelector?.('div.fixed.inset-0.z-50'))
      )
    );
    if (hasModal) {
      scheduleCustomize();
    }
  });

  if (document.body) {
    modalObs.observe(document.body, { childList: true, subtree: true });
    scheduleCustomize();
  }

  return () => {
    if (customizeRaf) cancelAnimationFrame(customizeRaf);
    modalObs.disconnect();
    if (currentWatchdogCallback === callback) {
      currentWatchdogCallback = null;
    }
  };
};

adminService.registerFeexpayWatchdog = registerFeexpayWatchdog;
adminService.cancelFeexpayPayment = cancelFeexpayPayment;
adminService.broadcastUserStatusChange = broadcastUserStatusChange;

export default adminService;
