const API_BASE = '/api';

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
    return localStorage.getItem('takapay_admin_token');
  },

  getClientToken() {
    return localStorage.getItem('takapay_client_token');
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
      throw new Error(data.message || 'Erreur lors de l’initialisation du paiement FeexPay.');
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
    return data;
  },

  getUser() {
    try {
      const u = localStorage.getItem('takapay_admin_user');
      return u ? JSON.parse(u) : null;
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
      body: JSON.stringify({ identifiant, password }),
    });

    if (!res.ok) {
      throw new Error('Identifiant ou mot de passe incorrect.');
    }

    const data = await res.json();
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
      const msg = data.message || Object.values(data.errors || {})?.[0]?.[0] || 'Erreur lors de la création du compte.';
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
      body: JSON.stringify({ identifiant, password }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.message || Object.values(data.errors || {})?.[0]?.[0] || 'Identifiant ou code PIN incorrect.';
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
        }).catch(() => { });
      }
    } finally {
      localStorage.removeItem('takapay_admin_token');
      localStorage.removeItem('takapay_admin_user');
    }
  },

  async getDashboardStats() {
    const token = this.getToken();
    if (token) {
      try {
        const res = await fetch(`${API_BASE}/admin/stats`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });
        if (res.ok) {
          const data = await res.json();
          return {
            ...EMPTY_STATS,
            ...data,
          };
        }
      } catch {
        // Échec API : on affiche l'état vide plutôt que des données inventées
      }
    }
    return EMPTY_STATS;
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
      // Éviter de saturer les 5Mo de localStorage avec un binaire vidéo base64 volumineux
      if (safeProduct.video && typeof safeProduct.video === 'object' && safeProduct.video.chemin?.startsWith('data:video/')) {
        safeProduct.video = { ...safeProduct.video, chemin: '' };
      } else if (typeof safeProduct.video === 'string' && safeProduct.video.startsWith('data:video/')) {
        safeProduct.video = null;
      }
      const existing = this.getCustomProducts();
      const filtered = existing.filter((p) => p.id !== product.id);
      const updated = [safeProduct, ...filtered];
      localStorage.setItem('takapay_created_products', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('takapay_products_updated', { detail: product }));
      return updated;
    } catch {
      return [];
    }
  },

  async getProduits() {
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
          return list;
        }
      }
    } catch {
      // Fallback
    }
    return [];
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
      const error = new Error(err.message || 'Erreur lors de la suppression du produit.');
      error.data = err;
      error.status = res.status;
      throw error;
    }
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
    window.dispatchEvent(new CustomEvent('takapay_products_updated', { detail: created }));
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
    window.dispatchEvent(new CustomEvent('takapay_products_updated', { detail: updated }));
    return { success: true, data: updated };
  },

  async getCategories() {
    try {
      const res = await fetch(`${API_BASE}/categories`, {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const json = await res.json();
        const apiList = json.data || json;
        if (Array.isArray(apiList)) {
          return apiList;
        }
      }
    } catch (_error) { void _error; }

    return [];
  },

  async createCategorie(payload) {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/categories`, {
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
      throw new Error(err.message || 'Erreur lors de la création de la catégorie.');
    }

    const json = await res.json();
    const created = json.data || json;
    window.dispatchEvent(new CustomEvent('takapay_categories_updated', { detail: created }));
    return { success: true, data: created };
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
    } catch (_error) { void _error; }
    return [];
  },

  async createSousCategorie(payload) {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/sous-categories`, {
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
      throw new Error(err.message || 'Erreur lors de la création de la sous-catégorie.');
    }

    const json = await res.json();
    const created = json.data || json;
    window.dispatchEvent(new CustomEvent('takapay_categories_updated', { detail: created }));
    return { success: true, data: created };
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
      throw new Error(err.message || 'Erreur lors de la suppression de la catégorie.');
    }

    const json = await res.json().catch(() => ({}));
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
      throw new Error(err.message || 'Erreur lors de la suppression de la sous-catégorie.');
    }

    const json = await res.json().catch(() => ({}));
    window.dispatchEvent(new CustomEvent('takapay_categories_updated', { detail: { id, deleted: true } }));
    return { success: true, ...json };
  },

  async getPromotions() {
    try {
      const res = await fetch(`${API_BASE}/promotions`);
      if (res.ok) {
        const json = await res.json();
        const list = json.data || json;
        if (Array.isArray(list)) {
          return list;
        }
      }
    } catch (_error) { void _error; }
    return [];
  },

  async createPromotion(payload) {
    const token = this.getToken();
    try {
      const res = await fetch(`${API_BASE}/promotions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        return { success: true, data: data.data || data };
      }
    } catch (_error) { void _error; }
    return {
      success: true,
      data: {
        id: Date.now(),
        pourcentage_promo: parseFloat(payload.pourcentage_promo),
        date_debut: payload.date_debut,
        date_fin: payload.date_fin,
        statut: payload.statut || 'actif',
        produits_count: 0,
      },
    };
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
    } catch (_error) { void _error; }
    return true;
  },

  // 2. GESTION DES CAGNOTTES
  async getCagnottes() {
    const token = this.getToken();
    try {
      const res = await fetch(`${API_BASE}/cagnottes`, {
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
    } catch (_error) { void _error; }
    return [];
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
    } catch (_error) { void _error; }
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
    } catch (_error) { void _error; }
    return true;
  },

  // 4. GESTION DES UTILISATEURS
  async getUsers(page = 1) {
    const token = this.getToken();
    try {
      const res = await fetch(`${API_BASE}/users?page=${page}`, {
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
          meta: json.meta || {
            current_page: page,
            last_page: 1,
            total: Array.isArray(list) ? list.length : 0,
            per_page: 15,
          },
        };
      }
    } catch (_error) { void _error; }
    return { data: [], meta: { current_page: 1, last_page: 1, total: 0, per_page: 15 } };
  },

  async updateUserStatus(userId, status) {
    const token = this.getToken();
    if (!token) {
      return false;
    }
    try {
      await fetch(`${API_BASE}/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        body: JSON.stringify({ statut_compte: status }),
      });
    } catch (_error) { void _error; }
    return true;
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
    } catch (_error) { void _error; }
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
    } catch (_error) { void _error; }
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
    } catch { /* ignore */ }
    return 0;
  },

  async getSupportConversations(page = 1) {
    const token = this.getToken();
    try {
      const res = await fetch(`${API_BASE}/admin/support/conversations?page=${page}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Accept: 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        return data.data || { data: [] };
      }
    } catch { /* ignore */ }
    return { data: [] };
  },

  async getSupportConversation(id) {
    const token = this.getToken();
    try {
      const res = await fetch(`${API_BASE}/admin/support/conversations/${id}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Accept: 'application/json',
        },
      });
      if (res.ok) {
        return await res.json();
      }
    } catch { /* ignore */ }
    return null;
  },

  async replySupportConversation(id, message) {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/admin/support/conversations/${id}/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Erreur lors de l’envoi de la réponse.');
    }
    return await res.json();
  },

  async closeSupportConversation(id) {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/admin/support/conversations/${id}/close`, {
      method: 'PATCH',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) {
      throw new Error('Erreur lors de la clôture de la conversation.');
    }
    return await res.json();
  },
};
