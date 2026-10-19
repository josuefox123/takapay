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

  saveCustomProduct(product) {
    try {
      const existing = this.getCustomProducts();
      const filtered = existing.filter((p) => p.id !== product.id);
      const updated = [product, ...filtered];
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
    try {
      await fetch(`${API_BASE}/produits/${produitId}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Accept: 'application/json',
        },
      });
    } catch { /* ignore */ }

    try {
      const custom = this.getCustomProducts();
      const filtered = custom.filter((p) => String(p.id) !== String(produitId));
      localStorage.setItem('takapay_created_products', JSON.stringify(filtered));
      window.dispatchEvent(new CustomEvent('takapay_products_updated'));
    } catch { /* ignore */ }
    return true;
  },

  async createProduit(payload) {
    const token = this.getToken();
    try {
      const res = await fetch(`${API_BASE}/admin/produits`, {
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
        const created = data.data || data;
        if (payload.video) {
          created.video = payload.video;
        }
        this.saveCustomProduct(created);
        return { success: true, data: created };
      }
    } catch {
      // Fallback
    }

    // Mode local démo synchronisé avec persistance
    const newPrd = {
      id: Date.now(),
      nom: payload.nom,
      sous_categorie_id: payload.sous_categorie_id,
      sous_categorie_nom: payload.sous_categorie_nom,
      categorie_nom: payload.categorie_nom,
      sous_categorie: {
        id: payload.sous_categorie_id,
        nom: payload.sous_categorie_nom || ('Catégorie ' + payload.sous_categorie_id),
        categorie: { nom: payload.categorie_nom || 'Général' },
      },
      stock: parseInt(payload.stock, 10),
      duree: parseInt(payload.duree, 10),
      couleur: payload.couleur || 'Standard',
      description: payload.description || '',
      images: payload.images || [],
      video: payload.video || null,
      parametre_produit: {
        reference: payload.reference || 'PRD-' + Math.floor(Math.random() * 900 + 100),
        prix_total: parseFloat(payload.prix_total),
        prix_minimum: parseFloat(payload.prix_minimum || (payload.prix_total * 0.1)),
        prix_echelonne: parseFloat(payload.prix_echelonne || (payload.prix_total / Math.max(1, payload.duree))),
        prix_cash: parseFloat(payload.prix_cash || payload.prix_total),
        seuil_livraison: parseFloat(payload.seuil_livraison || (payload.prix_total * 0.4)),
        mode_paiement: payload.mode_paiement || 'libre',
        frequence: payload.frequence || 'mensuelle',
        promotion: payload.promotion_id ? { id: payload.promotion_id, pourcentage_promo: 10 } : null,
      },
    };
    this.saveCustomProduct(newPrd);
    return { success: true, data: newPrd };
  },

  async updateProduit(id, payload) {
    const token = this.getToken();
    try {
      const res = await fetch(`${API_BASE}/produits/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        const updated = data.data || data;
        if (payload.video) {
          updated.video = payload.video;
        }
        this.saveCustomProduct(updated);
        return { success: true, data: updated };
      }
    } catch {
      // Fallback local
    }

    const updatedPrd = {
      id,
      nom: payload.nom,
      sous_categorie_id: payload.sous_categorie_id,
      sous_categorie_nom: payload.sous_categorie_nom,
      categorie_nom: payload.categorie_nom,
      sous_categorie: {
        id: payload.sous_categorie_id,
        nom: payload.sous_categorie_nom || ('Catégorie ' + payload.sous_categorie_id),
        categorie: { nom: payload.categorie_nom || 'Général' },
      },
      stock: parseInt(payload.stock, 10),
      duree: parseInt(payload.duree, 10),
      couleur: payload.couleur || 'Standard',
      description: payload.description || '',
      images: payload.images || [],
      video: payload.video || null,
      parametre_produit: {
        reference: payload.reference || ('PRD-' + id),
        prix_total: parseFloat(payload.prix_total),
        prix_minimum: parseFloat(payload.prix_minimum || (payload.prix_total * 0.1)),
        prix_echelonne: parseFloat(payload.prix_echelonne || (payload.prix_total / Math.max(1, payload.duree))),
        prix_cash: parseFloat(payload.prix_cash || payload.prix_total),
        seuil_livraison: parseFloat(payload.seuil_livraison || (payload.prix_total * 0.4)),
        mode_paiement: payload.mode_paiement || 'libre',
        frequence: payload.frequence || 'mensuelle',
        promotion: payload.promotion_id ? { id: payload.promotion_id, pourcentage_promo: 10 } : null,
      },
    };
    this.saveCustomProduct(updatedPrd);
    return { success: true, data: updatedPrd };
  },

  async getCategories() {
    let list = [];
    try {
      const res = await fetch(`${API_BASE}/categories`, {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const json = await res.json();
        const apiList = json.data || json;
        if (Array.isArray(apiList) && apiList.length > 0) {
          list = apiList;
        }
      }
    } catch (_error) { void _error; }

    try {
      const local = JSON.parse(localStorage.getItem('takapay_created_categories') || '[]');
      if (Array.isArray(local) && local.length > 0) {
        const existingIds = new Set(list.map((c) => String(c.id)));
        const existingNames = new Set(list.map((c) => (c.nom || '').toLowerCase()));
        local.forEach((c) => {
          if (!existingIds.has(String(c.id)) && !existingNames.has((c.nom || '').toLowerCase())) {
            list.push(c);
          }
        });
      }
    } catch { /* ignore */ }

    return list;
  },

  async createCategorie(payload) {
    const token = this.getToken();
    let created = null;
    try {
      const res = await fetch(`${API_BASE}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const json = await res.json();
        created = json.data || json;
      }
    } catch (_error) { void _error; }

    if (!created) {
      created = {
        id: Date.now(),
        nom: payload.nom,
        image: payload.image || null,
        sous_categories: [],
      };
    }

    try {
      const local = JSON.parse(localStorage.getItem('takapay_created_categories') || '[]');
      const filtered = local.filter((c) => c.id !== created.id);
      localStorage.setItem('takapay_created_categories', JSON.stringify([created, ...filtered]));
      window.dispatchEvent(new CustomEvent('takapay_categories_updated', { detail: created }));
    } catch { /* ignore */ }

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
        if (Array.isArray(list) && list.length > 0) {
          return list;
        }
      }
    } catch (_error) { void _error; }
    return [];
  },

  async createSousCategorie(payload) {
    const token = this.getToken();
    let created = null;
    try {
      const res = await fetch(`${API_BASE}/sous-categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const json = await res.json();
        created = json.data || json;
      }
    } catch (_error) { void _error; }

    if (!created) {
      created = {
        id: Date.now(),
        nom: payload.nom,
        categorie_id: parseInt(payload.categorie_id, 10),
      };
    }

    try {
      const local = JSON.parse(localStorage.getItem('takapay_created_subcategories') || '[]');
      const filtered = local.filter((s) => s.id !== created.id);
      localStorage.setItem('takapay_created_subcategories', JSON.stringify([created, ...filtered]));
      window.dispatchEvent(new CustomEvent('takapay_categories_updated', { detail: created }));
    } catch { /* ignore */ }

    return { success: true, data: created };
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
  async getUsers() {
    const token = this.getToken();
    try {
      const res = await fetch(`${API_BASE}/users`, {
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
};
