import { useState, useEffect } from 'react';
import AdminIcon from './AdminIcon';
import { adminService } from '../../services/adminService';
import { resolveImageUrl } from '../../data/clientStore';

export default function AdminProductsView({ onShowToast }) {
  const [produits, setProduits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sousCategories, setSousCategories] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('tous');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Mode de vue : 'list' | 'create' | 'edit' | 'categories'
  const [viewMode, setViewMode] = useState('list');
  const [editingProductId, setEditingProductId] = useState(null);

  // Erreurs de validation avec affichage en rouge sous les champs
  const [errors, setErrors] = useState({});
  const [catErrors, setCatErrors] = useState({});
  const [subCatErrors, setSubCatErrors] = useState({});

  // Modals pour la suppression
  const [productToDelete, setProductToDelete] = useState(null);
  const [blockedProduct, setBlockedProduct] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [subCategoryToDelete, setSubCategoryToDelete] = useState(null);
  const [blockedCategoryOrSub, setBlockedCategoryOrSub] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);
  const [isDeletingSubCategory, setIsDeletingSubCategory] = useState(false);

  // Formulaire Produit
  const [form, setForm] = useState({
    nom: '',
    categorie_id: '',
    sous_categorie_id: '',
    description: '',
    stock: 10,
    duree: 6, // Durée de disponibilité de l'article (mois)
    reference: '',
    prix_total: '',
    prix_cash: '',
    prix_minimum: '',
    prix_echelonne: '',
    mode_paiement: 'echelonne', // 'echelonne' | 'libre'
    frequence: 'mensuelle',
    seuil_livraison: '',
    promotion_id: '',
  });

  // Gestion des couleurs : distinction nette entre tarif standard et tarif spécifique
  const [couleursStandard, setCouleursStandard] = useState([{ nom: '' }]);
  const [couleursSpecifiques, setCouleursSpecifiques] = useState([]);

  const handleAddStandardColor = () => {
    setCouleursStandard((prev) => [...prev, { nom: '' }]);
  };
  const handleRemoveStandardColor = (index) => {
    setCouleursStandard((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== index) : prev));
  };
  const handleStandardColorChange = (index, value) => {
    setCouleursStandard((prev) =>
      prev.map((c, idx) => (idx === index ? { ...c, nom: value } : c))
    );
  };

  const handleAddSpecificColor = () => {
    setCouleursSpecifiques((prev) => [...prev, { nom: '', prix: '' }]);
  };
  const handleRemoveSpecificColor = (index) => {
    setCouleursSpecifiques((prev) => prev.filter((_, idx) => idx !== index));
  };
  const handleSpecificColorChange = (index, field, value) => {
    setCouleursSpecifiques((prev) =>
      prev.map((c, idx) => (idx === index ? { ...c, [field]: value } : c))
    );
  };

  const formatColorsDisplay = (couleurStr) => {
    if (!couleurStr) return '-';
    try {
      if (typeof couleurStr === 'string' && (couleurStr.startsWith('[') || couleurStr.startsWith('{'))) {
        const arr = JSON.parse(couleurStr);
        if (Array.isArray(arr) && arr.length > 0) {
          return arr
            .map((c) => (c.prix ? `${c.nom} (${Number(c.prix).toLocaleString('fr-FR')} F)` : c.nom))
            .join(' · ');
        }
      }
    } catch { /* ignore */ }
    return couleurStr;
  };

  // Images : Fichiers locaux uniquement (aucun champ d'URL manuelle)
  const [images, setImages] = useState([]);

  // Vidéo du produit : Optionnelle
  const [video, setVideo] = useState(null); // { chemin, nom_fichier, taille }

  // Formulaire Catégorie & Sous-Catégorie
  const [newCatName, setNewCatName] = useState('');
  const [newCatImage, setNewCatImage] = useState('');
  const [newCatImageName, setNewCatImageName] = useState('');
  const [newSubCatName, setNewSubCatName] = useState('');
  const [newSubCatImage, setNewSubCatImage] = useState('');
  const [newSubCatImageName, setNewSubCatImageName] = useState('');
  const [targetCatId, setTargetCatId] = useState('');
  const [catSubmitting, setCatSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      adminService.getProduits(),
      adminService.getSousCategories(),
      adminService.getPromotions(),
      adminService.getCategories(),
    ]).then(([prds, subCats, promos, cats]) => {
      if (isMounted) {
        setProduits(prds);
        setSousCategories(subCats);
        setPromotions(promos);
        setCategories(cats);
        if (cats.length > 0) {
          const firstCatId = cats[0].id;
          setTargetCatId(firstCatId);
          const matchingSubs = subCats.filter(
            (s) => String(s.categorie_id) === String(firstCatId) || String(s.categorie?.id) === String(firstCatId)
          );
          setForm((f) => ({
            ...f,
            categorie_id: f.categorie_id || firstCatId,
            sous_categorie_id: f.sous_categorie_id || (matchingSubs[0]?.id || ''),
          }));
        }
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Sous-catégories filtrées dynamiquement selon la catégorie choisie
  const availableSubCategories = form.categorie_id
    ? sousCategories.filter(
        (s) =>
          String(s.categorie_id) === String(form.categorie_id) ||
          String(s.categorie?.id) === String(form.categorie_id)
      )
    : [];

  // Changement dynamique de la catégorie du produit
  const handleCategoryChange = (e) => {
    const selectedCatId = e.target.value;
    const matchingSubs = sousCategories.filter(
      (s) =>
        String(s.categorie_id) === String(selectedCatId) ||
        String(s.categorie?.id) === String(selectedCatId)
    );
    setForm((prev) => ({
      ...prev,
      categorie_id: selectedCatId,
      sous_categorie_id: matchingSubs.length > 0 ? matchingSubs[0].id : '',
    }));
    setErrors((prev) => ({
      ...prev,
      categorie_id: null,
      sous_categorie_id: null,
    }));
  };

  // Gestion des images (fichiers locaux multiples)
  const handleMultipleFilesSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    let loadedCount = 0;
    const newItems = [];

    files.forEach((file, fileIdx) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        newItems.push({
          chemin: event.target.result,
          nom_fichier: file.name,
          position: images.length + fileIdx + 1,
          is_principal: images.length === 0 && fileIdx === 0,
        });
        loadedCount++;
        if (loadedCount === files.length) {
          setImages((prev) => {
            const combined = [...prev, ...newItems];
            if (!combined.some((img) => img.is_principal) && combined.length > 0) {
              combined[0].is_principal = true;
            }
            return combined;
          });
          onShowToast(`${files.length} photo(s) ajoutée(s)`);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleSetPrincipalImage = (index) => {
    setImages((prev) =>
      prev.map((img, idx) => ({
        ...img,
        is_principal: idx === index,
      }))
    );
  };

  const handleRemoveImage = (index) => {
    setImages((prev) => {
      const filtered = prev.filter((_, idx) => idx !== index);
      if (filtered.length > 0 && !filtered.some((img) => img.is_principal)) {
        filtered[0].is_principal = true;
      }
      return filtered.map((img, idx) => ({ ...img, position: idx + 1 }));
    });
  };

  // Gestion de la vidéo optionnelle avec téléversement immédiat
  const handleVideoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 80 * 1024 * 1024) {
      alert('La vidéo dépasse 80 Mo. Veuillez sélectionner un fichier plus léger.');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setVideo({
      chemin: previewUrl,
      nom_fichier: file.name,
      taille: (file.size / (1024 * 1024)).toFixed(1) + ' Mo',
      file: file,
    });
    onShowToast('Vidéo importée ! Téléversement en cours...');

    adminService.uploadVideo(file).then((res) => {
      if (res && (res.chemin || res.url)) {
        setVideo({
          chemin: res.chemin || res.url,
          nom_fichier: file.name,
          taille: (file.size / (1024 * 1024)).toFixed(1) + ' Mo',
        });
        onShowToast('Vidéo enregistrée sur le serveur avec succès !');
      }
    }).catch((err) => {
      console.warn('Erreur téléversement vidéo direct:', err);
    });
    e.target.value = '';
  };

  const handleRemoveVideo = () => {
    setVideo(null);
    onShowToast('Vidéo retirée.');
  };

  // Déclenchement de la suppression avec vérification préalable
  const handleInitiateDelete = (product) => {
    if (product.has_active_cagnotte || (product.cagnottes_actives_count && product.cagnottes_actives_count > 0)) {
      setBlockedProduct(product);
    } else {
      setProductToDelete(product);
    }
  };

  // Confirmation et exécution de la suppression
  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      await adminService.deleteProduit(productToDelete.id);
      setProduits((prev) => prev.filter((p) => p.id !== productToDelete.id));
      onShowToast(`Produit "${productToDelete.nom}" supprimé avec succès.`);
      setProductToDelete(null);
    } catch (err) {
      if (err?.data?.has_active_cagnotte || err?.status === 422) {
        const prod = productToDelete;
        setProductToDelete(null);
        setBlockedProduct(prod);
      } else {
        alert(err.message || 'Erreur lors de la suppression.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Ouverture du formulaire de création
  const handleOpenCreate = () => {
    setEditingProductId(null);
    setErrors({});
    const initialCatId = categories[0]?.id || '';
    const matchingSubs = sousCategories.filter(
      (s) => String(s.categorie_id) === String(initialCatId) || String(s.categorie?.id) === String(initialCatId)
    );
    setCouleursStandard([{ nom: '' }]);
    setCouleursSpecifiques([]);
    setForm({
      nom: '',
      categorie_id: initialCatId,
      sous_categorie_id: matchingSubs[0]?.id || '',
      description: '',
      stock: 10,
      duree: 6,
      reference: '',
      prix_total: '',
      prix_cash: '',
      prix_minimum: '',
      prix_echelonne: '',
      mode_paiement: 'echelonne',
      frequence: 'mensuelle',
      seuil_livraison: '',
      promotion_id: '',
    });
    setImages([]);
    setVideo(null);
    setViewMode('create');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Ouverture du formulaire de modification au clic sur la ligne
  const handleEditProduct = (item) => {
    setEditingProductId(item.id);
    setErrors({});
    const param = item.parametre_produit || {};

    const sub = sousCategories.find(
      (s) => String(s.id) === String(item.sous_categorie_id || item.sous_categorie?.id)
    );
    const cat = categories.find(
      (c) =>
        String(c.id) === String(item.categorie_id || sub?.categorie_id || sub?.categorie?.id) ||
        c.nom === item.categorie_nom ||
        c.nom === sub?.categorie?.nom
    );

    const activeCatId = cat?.id || item.categorie_id || sub?.categorie_id || (categories[0]?.id || '');
    const activeSubId = item.sous_categorie_id || item.sous_categorie?.id || '';

    // Parsing des couleurs (séparation entre tarif standard et tarif spécifique)
    let loadedStandards = [];
    let loadedSpecifiques = [];
    if (item.couleur) {
      try {
        if (typeof item.couleur === 'string' && (item.couleur.startsWith('[') || item.couleur.startsWith('{'))) {
          const parsed = JSON.parse(item.couleur);
          if (Array.isArray(parsed) && parsed.length > 0) {
            parsed.forEach((c) => {
              const nom = typeof c === 'string' ? c : (c.nom || c.name || '');
              const hasPrice = typeof c === 'object' && c.prix !== undefined && c.prix !== null && c.prix !== '' && Number(c.prix) > 0;
              if (hasPrice) {
                loadedSpecifiques.push({ nom, prix: Number(c.prix) });
              } else if (nom) {
                loadedStandards.push({ nom });
              }
            });
          }
        } else if (typeof item.couleur === 'string') {
          const parts = item.couleur.split(',').map((c) => c.trim()).filter(Boolean);
          parts.forEach((p) => {
            const matchParen = p.match(/^([^()]+)\s*\(([^)]+)\)$/);
            const matchColon = p.match(/^([^:]+)\s*:\s*(\d+)/);
            if (matchParen) {
              const cName = matchParen[1].trim();
              const numStr = matchParen[2].replace(/[^\d]/g, '');
              loadedSpecifiques.push({ nom: cName, prix: numStr ? Number(numStr) : '' });
            } else if (matchColon) {
              const cName = matchColon[1].trim();
              loadedSpecifiques.push({ nom: cName, prix: Number(matchColon[2]) });
            } else {
              loadedStandards.push({ nom: p });
            }
          });
        }
      } catch {
        loadedStandards = [{ nom: item.couleur || '' }];
      }
    }
    if (loadedStandards.length === 0 && loadedSpecifiques.length === 0) {
      loadedStandards = [{ nom: '' }];
    }
    setCouleursStandard(loadedStandards);
    setCouleursSpecifiques(loadedSpecifiques);

    const activeMode = param.mode_paiement === 'libre' ? 'libre' : 'echelonne';
    setForm({
      nom: item.nom || '',
      categorie_id: activeCatId,
      sous_categorie_id: activeSubId,
      description: item.description || '',
      stock: item.stock !== undefined ? item.stock : 10,
      duree: item.duree !== undefined ? item.duree : 6,
      reference: param.reference || '',
      prix_total: param.prix_total !== undefined ? param.prix_total : '',
      prix_cash: param.prix_cash !== undefined ? param.prix_cash : '',
      prix_minimum: param.prix_minimum !== undefined ? param.prix_minimum : '',
      prix_echelonne: param.prix_echelonne !== undefined ? param.prix_echelonne : '',
      mode_paiement: activeMode,
      frequence: param.frequence || 'mensuelle',
      seuil_livraison: param.seuil_livraison !== undefined ? param.seuil_livraison : '',
      promotion_id: param.promotion_id || '',
    });

    // Récupération des images existantes
    const rawImgs = Array.isArray(item.image_produits) && item.image_produits.length > 0
      ? item.image_produits
      : Array.isArray(item.images) && item.images.length > 0
      ? item.images
      : item.im
      ? [{ chemin: item.im, is_principal: true, position: 1 }]
      : [];

    setImages(
      rawImgs.map((img, idx) => ({
        chemin: typeof img === 'string' ? resolveImageUrl(img) : (img.url || resolveImageUrl(img.chemin)),
        nom_fichier: typeof img === 'string' ? img : (img.nom_fichier || img.chemin || `image-${idx + 1}.jpg`),
        position: idx + 1,
        is_principal: img.is_principal === true || img.is_principal === 1 || idx === 0,
      }))
    );

    // Vidéo
    if (item.video) {
      setVideo(typeof item.video === 'string' ? { chemin: item.video, nom_fichier: 'Vidéo du produit' } : item.video);
    } else {
      setVideo(null);
    }

    setViewMode('edit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Validation stricte du formulaire produit
  const validateProductForm = () => {
    const errs = {};
    if (!form.nom || !form.nom.trim()) {
      errs.nom = "Le nom de l'article est requis.";
    }
    if (!form.categorie_id) {
      errs.categorie_id = "Veuillez renseigner la catégorie à laquelle appartient le produit.";
    }
    if (!form.sous_categorie_id) {
      errs.sous_categorie_id = "Veuillez renseigner la sous-catégorie du produit.";
    }
    if (!form.prix_total || Number(form.prix_total) <= 0) {
      errs.prix_total = "Le prix total de vente est requis et doit être supérieur à 0 FCFA.";
    }
    if (form.stock === '' || form.stock === null || Number(form.stock) < 0) {
      errs.stock = "Le stock disponible est requis (minimum 0).";
    }
    if (form.duree === '' || form.duree === null || Number(form.duree) < 1) {
      errs.duree = "La durée de disponibilité de l'article doit être d'au moins 1 mois.";
    }
    return errs;
  };

  // Enregistrement du produit (Création ou Mise à jour)
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    const validationErrors = validateProductForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      onShowToast('Veuillez corriger les champs obligatoires signalés en rouge ci-dessous.');
      window.scrollTo({ top: 120, behavior: 'smooth' });
      return;
    }
    setErrors({});

    const targetSub = sousCategories.find((s) => String(s.id) === String(form.sous_categorie_id));
    const targetCat =
      categories.find((c) => String(c.id) === String(form.categorie_id)) ||
      (targetSub ? categories.find((c) => String(c.id) === String(targetSub.categorie_id)) : null);

    const cleanedStandards = couleursStandard
      .map((c) => ({
        nom: (c.nom || '').trim(),
        prix: null,
        hasCustomPrice: false,
      }))
      .filter((c) => c.nom.length > 0);

    const cleanedSpecifiques = couleursSpecifiques
      .map((c) => ({
        nom: (c.nom || '').trim(),
        prix: c.prix !== '' && Number(c.prix) > 0 ? Number(c.prix) : null,
        hasCustomPrice: true,
      }))
      .filter((c) => c.nom.length > 0);

    // Formatage propre et lisible pour la base de données (sans JSON brut ni clé "nom:")
    const colorTokens = [];
    cleanedStandards.forEach((c) => {
      colorTokens.push(c.nom);
    });
    cleanedSpecifiques.forEach((c) => {
      if (c.prix) {
        colorTokens.push(`${c.nom} (${Number(c.prix).toLocaleString('fr-FR')} F)`);
      } else {
        colorTokens.push(c.nom);
      }
    });
    const finalColorsStr = colorTokens.length > 0 ? colorTokens.join(', ') : '';

    setSubmitting(true);
    try {
      let finalVideo = video;
      if (video && video.file && (!video.chemin || video.chemin.startsWith('blob:') || video.chemin.startsWith('data:'))) {
        try {
          const uploadRes = await adminService.uploadVideo(video.file);
          if (uploadRes && (uploadRes.chemin || uploadRes.url)) {
            finalVideo = {
              chemin: uploadRes.chemin || uploadRes.url,
              nom_fichier: video.nom_fichier,
              taille: video.taille,
            };
          }
        } catch (e) {
          console.warn('Erreur téléversement vidéo avant soumission:', e);
        }
      }

      const cleanNum = (val) => {
        if (val === '' || val === null || val === undefined) return null;
        const cleaned = String(val).replace(/\s+/g, '').replace(',', '.').replace(/[^0-9.]/g, '');
        return cleaned === '' ? null : Number(cleaned);
      };

      const payload = {
        ...form,
        prix_total: cleanNum(form.prix_total),
        prix_minimum: cleanNum(form.prix_minimum),
        prix_echelonne: cleanNum(form.prix_echelonne),
        prix_cash: cleanNum(form.prix_cash),
        stock: cleanNum(form.stock) ?? 0,
        duree: cleanNum(form.duree) ?? 6,
        seuil_livraison: form.mode_paiement === 'libre' ? null : cleanNum(form.seuil_livraison),
        promotion_id: form.promotion_id ? Number(form.promotion_id) : null,
        couleur: finalColorsStr,
        images,
        video: finalVideo,
        categorie_id: form.categorie_id || targetCat?.id || '',
        categorie_nom: targetCat?.nom || '',
        sous_categorie_id: form.sous_categorie_id ? Number(form.sous_categorie_id) : '',
        sous_categorie_nom: targetSub?.nom || '',
      };

      if (editingProductId) {
        const res = await adminService.updateProduit(editingProductId, payload);
        if (res.success) {
          setProduits((prev) =>
            prev.map((p) => (p.id === editingProductId ? res.data : p))
          );
          setViewMode('list');
          onShowToast('Produit mis à jour avec succès');
        }
      } else {
        const res = await adminService.createProduit(payload);
        if (res.success) {
          setProduits((prev) => [res.data, ...prev]);
          setViewMode('list');
          onShowToast('Produit créé avec succès avec sa catégorie et sous-catégorie');
        }
      }
    } catch (err) {
      console.error('Erreur enregistrement produit:', err);
      if (err?.errors) {
        const fieldErrors = {};
        Object.entries(err.errors).forEach(([k, v]) => {
          fieldErrors[k] = Array.isArray(v) ? v[0] : v;
        });
        setErrors((prev) => ({ ...prev, ...fieldErrors }));
      }
      alert(err?.message || "Erreur lors de l'enregistrement du produit.");
    } finally {
      setSubmitting(false);
    }
  };

  // Création d'une catégorie avec validation
  const handleCatImageFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewCatImageName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setNewCatImage(ev.target.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubCatImageFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewSubCatImageName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setNewSubCatImage(ev.target.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      setCatErrors({ nom: 'Le nom de la catégorie est obligatoire.' });
      return;
    }
    setCatErrors({});
    setCatSubmitting(true);
    try {
      const res = await adminService.createCategorie({
        nom: newCatName.trim(),
        image: newCatImage.trim() || null,
        nom_fichier: newCatImageName || null,
      });
      if (res.success) {
        setCategories((prev) => [...prev, res.data]);
        if (!targetCatId) setTargetCatId(res.data.id);
        setNewCatName('');
        setNewCatImage('');
        setNewCatImageName('');
        onShowToast(`Catégorie "${res.data.nom}" créée avec succès !`);
      }
    } catch (err) {
      const errMsg = err?.message || 'Erreur lors de la création de la catégorie.';
      if (err?.errors?.nom) {
        setCatErrors({ nom: err.errors.nom[0] });
      }
      if (onShowToast) onShowToast(errMsg);
    } finally {
      setCatSubmitting(false);
    }
  };

  // Création d'une sous-catégorie avec validation
  const handleCreateSousCategory = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!targetCatId) {
      errs.targetCatId = 'Veuillez sélectionner la catégorie parente.';
    }
    if (!newSubCatName.trim()) {
      errs.nom = 'Le nom de la sous-catégorie est obligatoire.';
    }
    if (Object.keys(errs).length > 0) {
      setSubCatErrors(errs);
      return;
    }
    setSubCatErrors({});
    setCatSubmitting(true);
    try {
      const res = await adminService.createSousCategorie({
        nom: newSubCatName.trim(),
        categorie_id: targetCatId,
        image: newSubCatImage.trim() || null,
        nom_fichier: newSubCatImageName || null,
      });
      if (res.success) {
        setSousCategories((prev) => [...prev, res.data]);
        setForm((f) => ({
          ...f,
          categorie_id: targetCatId,
          sous_categorie_id: res.data.id,
        }));
        setNewSubCatName('');
        setNewSubCatImage('');
        setNewSubCatImageName('');
        onShowToast(`Sous-catégorie "${res.data.nom}" créée avec succès !`);
      }
    } catch (err) {
      const errMsg = err?.message || 'Erreur lors de la création de la sous-catégorie.';
      if (err?.errors?.nom) {
        setSubCatErrors((prev) => ({ ...prev, nom: err.errors.nom[0] }));
      }
      if (onShowToast) onShowToast(errMsg);
    } finally {
      setCatSubmitting(false);
    }
  };

  // Déclenchement de la suppression d'une catégorie avec vérification préalable
  const handleDeleteCategory = (cat) => {
    const subIds = sousCategories
      .filter((s) => String(s.categorie_id) === String(cat.id) || String(s.categorie?.id) === String(cat.id))
      .map((s) => String(s.id));

    const hasActive = produits.some(
      (p) =>
        (String(p.categorie_id) === String(cat.id) || subIds.includes(String(p.sous_categorie_id)) || subIds.includes(String(p.sous_categorie?.id))) &&
        (p.has_active_cagnotte || (p.cagnottes_actives_count && p.cagnottes_actives_count > 0))
    );

    if (hasActive) {
      setBlockedCategoryOrSub({
        type: 'catégorie',
        nom: cat.nom,
      });
      return;
    }

    const subs = sousCategories.filter(
      (s) => String(s.categorie_id) === String(cat.id) || String(s.categorie?.id) === String(cat.id)
    );

    setCategoryToDelete({ cat, subsCount: subs.length });
  };

  const handleConfirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    const { cat } = categoryToDelete;
    setIsDeletingCategory(true);
    try {
      await adminService.deleteCategorie(cat.id);
      setCategories((prev) => prev.filter((c) => String(c.id) !== String(cat.id)));
      setSousCategories((prev) =>
        prev.filter((s) => String(s.categorie_id) !== String(cat.id) && String(s.categorie?.id) !== String(cat.id))
      );
      if (onShowToast) {
        onShowToast(`Catégorie "${cat.nom}" supprimée avec succès.`);
      }
      setCategoryToDelete(null);
    } catch (err) {
      setCategoryToDelete(null);
      if (
        err?.status === 422 ||
        err?.message?.includes('cagnotte') ||
        err?.message?.includes('achat') ||
        err?.data?.message?.includes('cagnotte') ||
        err?.data?.message?.includes('achat')
      ) {
        setBlockedCategoryOrSub({
          type: 'catégorie',
          nom: cat.nom,
        });
      } else if (onShowToast) {
        onShowToast(err.message || 'Erreur lors de la suppression de la catégorie.');
      }
    } finally {
      setIsDeletingCategory(false);
    }
  };

  // Déclenchement de la suppression d'une sous-catégorie avec vérification préalable
  const handleDeleteSousCategory = (sub) => {
    const hasActive = produits.some(
      (p) =>
        (String(p.sous_categorie_id) === String(sub.id) || String(p.sous_categorie?.id) === String(sub.id)) &&
        (p.has_active_cagnotte || (p.cagnottes_actives_count && p.cagnottes_actives_count > 0))
    );

    if (hasActive) {
      setBlockedCategoryOrSub({
        type: 'sous-catégorie',
        nom: sub.nom,
      });
      return;
    }

    setSubCategoryToDelete(sub);
  };

  const handleConfirmDeleteSousCategory = async () => {
    if (!subCategoryToDelete) return;
    const sub = subCategoryToDelete;
    setIsDeletingSubCategory(true);
    try {
      await adminService.deleteSousCategorie(sub.id);
      setSousCategories((prev) => prev.filter((s) => String(s.id) !== String(sub.id)));
      if (onShowToast) {
        onShowToast(`Sous-catégorie "${sub.nom}" supprimée.`);
      }
      setSubCategoryToDelete(null);
    } catch (err) {
      setSubCategoryToDelete(null);
      if (
        err?.status === 422 ||
        err?.message?.includes('cagnotte') ||
        err?.message?.includes('achat') ||
        err?.data?.message?.includes('cagnotte') ||
        err?.data?.message?.includes('achat')
      ) {
        setBlockedCategoryOrSub({
          type: 'sous-catégorie',
          nom: sub.nom,
        });
      } else if (onShowToast) {
        onShowToast(err.message || 'Erreur lors de la suppression de la sous-catégorie.');
      }
    } finally {
      setIsDeletingSubCategory(false);
    }
  };

  // Filtrage de la table des produits
  const filtered = produits.filter((p) => {
    const matchSearch =
      p.nom?.toLowerCase().includes(search.toLowerCase()) ||
      (p.parametre_produit?.reference || '').toLowerCase().includes(search.toLowerCase());
    const matchCat =
      selectedCat === 'tous' ||
      p.sous_categorie?.id?.toString() === selectedCat ||
      p.sous_categorie_id?.toString() === selectedCat;
    return matchSearch && matchCat;
  });

  // Calcul auto des suggestions financières
  const autoMinStart = form.prix_total ? Math.round(Number(form.prix_total) * 0.1) : 0;
  const dureeDispo = Math.max(1, Number(form.duree || 6));
  const autoEch =
    form.prix_total
      ? Math.round((Number(form.prix_total) - autoMinStart) / dureeDispo)
      : 0;
  const autoSeuil = form.prix_total ? Math.round(Number(form.prix_total) * 0.4) : 0;
  // Durée de fin estimée calculée mathématiquement à partir du versement périodique
  const activeEchVal = form.prix_echelonne && Number(form.prix_echelonne) > 0 ? Number(form.prix_echelonne) : autoEch;
  const autoDureeEstimeeMois =
    form.prix_total && activeEchVal > 0
      ? Math.ceil(Math.max(0, Number(form.prix_total) - (form.prix_minimum ? Number(form.prix_minimum) : autoMinStart)) / activeEchVal)
      : dureeDispo;

  // =========================================================================
  // VUE 1 : GESTION DES CATÉGORIES (PAGE INTÉGRÉE BIEN AÉRÉE)
  // =========================================================================
  if (viewMode === 'categories') {
    return (
      <div>
        <button
          type="button"
          onClick={() => setViewMode('list')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--mut)',
            fontSize: '15px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '18px',
            padding: '6px 0',
          }}
        >
          <span>← Retour à la liste des produits</span>
        </button>

        <div style={{ marginBottom: '28px' }}>
          <h1 className="admin-header-title">Gestion des Catégories & Sous-Catégories</h1>
          <p className="admin-header-sub">
            Structurez le catalogue de Takapay pour que chaque article soit précisément positionné.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px', marginBottom: '28px' }}>
          {/* Formulaire Création Catégorie */}
          <div className="admin-panel" style={{ padding: '28px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--r)' }} />
              1. Nouvelle Catégorie Principale
            </h2>
            <form onSubmit={handleCreateCategory} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="admin-field" style={{ margin: 0 }}>
                <label style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px', display: 'block' }}>
                  Nom de la catégorie *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Électroménager, Informatique, Motos..."
                  value={newCatName}
                  onChange={(e) => {
                    setNewCatName(e.target.value);
                    if (catErrors.nom) setCatErrors({});
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: catErrors.nom ? '2px solid #dc2626' : '1.5px solid var(--line)',
                    fontSize: '15px',
                  }}
                />
                {catErrors.nom && (
                  <span style={{ color: '#dc2626', fontSize: '13px', fontWeight: 600, marginTop: '6px', display: 'block' }}>
                    ⚠ {catErrors.nom}
                  </span>
                )}
              </div>

              <div className="admin-field" style={{ margin: 0 }}>
                <label style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px', display: 'block' }}>
                  Visuel / Image de couverture
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCatImageFile}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid var(--line)', fontSize: '14px' }}
                />
                {newCatImage && (
                  <div style={{ marginTop: '10px' }}>
                    <img src={newCatImage} alt="Aperçu" style={{ height: '70px', borderRadius: '8px', objectFit: 'cover' }} />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={catSubmitting}
                className="admin-btn"
                style={{ padding: '12px 20px', fontSize: '15px', alignSelf: 'flex-start', marginTop: '6px' }}
              >
                {catSubmitting ? 'Création en cours...' : '+ Créer la catégorie'}
              </button>
            </form>
          </div>

          {/* Formulaire Création Sous-Catégorie */}
          <div className="admin-panel" style={{ padding: '28px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--y)' }} />
              2. Nouvelle Sous-Catégorie
            </h2>
            <form onSubmit={handleCreateSousCategory} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="admin-field" style={{ margin: 0 }}>
                <label style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px', display: 'block' }}>
                  Catégorie parente *
                </label>
                <select
                  value={targetCatId}
                  onChange={(e) => {
                    setTargetCatId(e.target.value);
                    if (subCatErrors.targetCatId) setSubCatErrors((prev) => ({ ...prev, targetCatId: null }));
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: subCatErrors.targetCatId ? '2px solid #dc2626' : '1.5px solid var(--line)',
                    fontSize: '15px',
                  }}
                >
                  <option value="">Sélectionnez la catégorie parente...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom}
                    </option>
                  ))}
                </select>
                {subCatErrors.targetCatId && (
                  <span style={{ color: '#dc2626', fontSize: '13px', fontWeight: 600, marginTop: '6px', display: 'block' }}>
                    ⚠ {subCatErrors.targetCatId}
                  </span>
                )}
              </div>

              <div className="admin-field" style={{ margin: 0 }}>
                <label style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px', display: 'block' }}>
                  Nom de la sous-catégorie *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Réfrigérateurs, Smartphones, Ordinateurs..."
                  value={newSubCatName}
                  onChange={(e) => {
                    setNewSubCatName(e.target.value);
                    if (subCatErrors.nom) setSubCatErrors((prev) => ({ ...prev, nom: null }));
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: subCatErrors.nom ? '2px solid #dc2626' : '1.5px solid var(--line)',
                    fontSize: '15px',
                  }}
                />
                {subCatErrors.nom && (
                  <span style={{ color: '#dc2626', fontSize: '13px', fontWeight: 600, marginTop: '6px', display: 'block' }}>
                    ⚠ {subCatErrors.nom}
                  </span>
                )}
              </div>

              <div className="admin-field" style={{ margin: 0 }}>
                <label style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px', display: 'block' }}>
                  Visuel / Image de la sous-catégorie
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleSubCatImageFile}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid var(--line)', fontSize: '14px' }}
                />
                {newSubCatImage && (
                  <div style={{ marginTop: '10px' }}>
                    <img src={newSubCatImage} alt="Aperçu sous-catégorie" style={{ height: '70px', borderRadius: '8px', objectFit: 'cover' }} />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={catSubmitting}
                className="admin-btn"
                style={{ padding: '12px 20px', fontSize: '15px', alignSelf: 'flex-start', marginTop: '6px' }}
              >
                {catSubmitting ? 'Création en cours...' : '+ Créer la sous-catégorie'}
              </button>
            </form>
          </div>
        </div>

        {/* Liste aérée des catégories existantes */}
        <div className="admin-panel" style={{ padding: '28px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 20px' }}>
            Arborescence Actuelle des Catégories ({categories.length})
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '18px' }}>
            {categories.map((cat) => {
              const subs = sousCategories.filter(
                (s) => String(s.categorie_id) === String(cat.id) || String(s.categorie?.id) === String(cat.id)
              );
              return (
                <div
                  key={cat.id}
                  style={{
                    background: 'var(--bg)',
                    border: '1.5px solid var(--line)',
                    borderRadius: '14px',
                    padding: '18px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      {cat.image ? (
                        <img src={cat.image} alt={cat.nom} style={{ width: '42px', height: '42px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'var(--soft)', display: 'grid', placeItems: 'center', fontSize: '20px', flexShrink: 0 }}>
                          📦
                        </div>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <strong style={{ fontSize: '16px', display: 'block', color: 'var(--ink)' }}>{cat.nom}</strong>
                        <span style={{ fontSize: '12px', color: 'var(--mut)' }}>{subs.length} sous-catégorie(s)</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat)}
                      title={`Supprimer la catégorie "${cat.nom}"`}
                      aria-label={`Supprimer ${cat.nom}`}
                      style={{
                        background: '#fee2e2',
                        color: '#dc2626',
                        border: 'none',
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#fecaca';
                        e.currentTarget.style.transform = 'scale(1.08)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#fee2e2';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '18px' }}>
                        delete
                      </span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {subs.map((s) => (
                      <span
                        key={s.id}
                        style={{
                          background: 'var(--card)',
                          border: '1px solid var(--line)',
                          padding: '4px 8px 4px 10px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          color: 'var(--ink)',
                          fontWeight: 500,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {s.image && (
                          <img
                            src={s.image}
                            alt={s.nom}
                            style={{ width: '18px', height: '18px', borderRadius: '4px', objectFit: 'cover' }}
                          />
                        )}
                        <span>{s.nom}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteSousCategory(s)}
                          title={`Supprimer la sous-catégorie "${s.nom}"`}
                          aria-label={`Supprimer ${s.nom}`}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#9ca3af',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '50%',
                            transition: 'color 0.15s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#dc2626')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#9ca3af')}
                        >
                          <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '14px' }}>
                            close
                          </span>
                        </button>
                      </span>
                    ))}
                    {subs.length === 0 && (
                      <span style={{ fontSize: '12px', color: 'var(--mut)', fontStyle: 'italic' }}>
                        Aucune sous-catégorie
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal : Signalement que la catégorie ou sous-catégorie ne peut pas être supprimée */}
        {blockedCategoryOrSub && (
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.65)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              backdropFilter: 'blur(4px)',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setBlockedCategoryOrSub(null);
            }}
          >
            <div
              style={{
                background: 'var(--card, #ffffff)',
                borderRadius: '20px',
                maxWidth: '480px',
                width: '100%',
                padding: '28px',
                border: '1px solid var(--line, #e2e8f0)',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              }}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '14px',
                  background: '#fef3c7',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px', color: 'var(--ink, #0f172a)' }}>
                Suppression impossible
              </h3>

              <p style={{ color: 'var(--ink, #334155)', fontSize: '14px', lineHeight: 1.5, marginBottom: '14px' }}>
                {blockedCategoryOrSub.type === 'catégorie' ? 'La catégorie' : 'La sous-catégorie'} <strong>« {blockedCategoryOrSub.nom} »</strong> ne peut pas être supprimée car <strong>une cagnotte est actuellement en cours</strong> sur l'un de ses produits.
              </p>

              <div
                style={{
                  background: '#fffbeb',
                  border: '1px solid #fef3c7',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  marginBottom: '20px',
                  fontSize: '13px',
                  color: '#92400e',
                  lineHeight: 1.5,
                }}
              >
                Pour garantir la sécurité des paiements déjà engagés, un élément associé à une cagnotte active ne peut pas être retiré de la base de données.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setBlockedCategoryOrSub(null)}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '10px',
                    background: '#ffffff',
                    color: '#0f172a',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  }}
                >
                  J'ai compris
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal : Confirmation de suppression d'une catégorie */}
        {categoryToDelete && (
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.65)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              backdropFilter: 'blur(4px)',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget && !isDeletingCategory) setCategoryToDelete(null);
            }}
          >
            <div
              style={{
                background: 'var(--card, #ffffff)',
                borderRadius: '20px',
                maxWidth: '480px',
                width: '100%',
                padding: '28px',
                border: '1px solid var(--line, #e2e8f0)',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              }}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '14px',
                  background: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                }}
              >
                <AdminIcon name="trash" size={26} />
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px', color: 'var(--ink, #0f172a)' }}>
                Confirmer la suppression
              </h3>

              <p style={{ color: 'var(--ink, #334155)', fontSize: '14px', lineHeight: 1.5, marginBottom: '14px' }}>
                Êtes-vous sûr de vouloir supprimer la catégorie <strong>« {categoryToDelete.cat.nom} »</strong> ?
              </p>

              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fee2e2',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  marginBottom: '20px',
                  fontSize: '13px',
                  color: '#991b1b',
                  lineHeight: 1.5,
                }}
              >
                {categoryToDelete.subsCount > 0
                  ? `Attention : cela supprimera également ses ${categoryToDelete.subsCount} sous-catégorie(s) et les produits associés. Cette action est irréversible.`
                  : 'Attention : cette action est irréversible. Les produits associés à cette catégorie seront également supprimés.'}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  disabled={isDeletingCategory}
                  onClick={() => setCategoryToDelete(null)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    background: 'var(--soft, #f1f5f9)',
                    color: 'var(--ink, #0f172a)',
                    border: '1px solid var(--line, #e2e8f0)',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: isDeletingCategory ? 'not-allowed' : 'pointer',
                  }}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={isDeletingCategory}
                  onClick={handleConfirmDeleteCategory}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    background: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: isDeletingCategory ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    opacity: isDeletingCategory ? 0.7 : 1,
                  }}
                >
                  {isDeletingCategory ? 'Suppression...' : 'Supprimer définitivement'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal : Confirmation de suppression d'une sous-catégorie */}
        {subCategoryToDelete && (
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.65)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              backdropFilter: 'blur(4px)',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget && !isDeletingSubCategory) setSubCategoryToDelete(null);
            }}
          >
            <div
              style={{
                background: 'var(--card, #ffffff)',
                borderRadius: '20px',
                maxWidth: '480px',
                width: '100%',
                padding: '28px',
                border: '1px solid var(--line, #e2e8f0)',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              }}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '14px',
                  background: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                }}
              >
                <AdminIcon name="trash" size={26} />
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px', color: 'var(--ink, #0f172a)' }}>
                Confirmer la suppression
              </h3>

              <p style={{ color: 'var(--ink, #334155)', fontSize: '14px', lineHeight: 1.5, marginBottom: '14px' }}>
                Êtes-vous sûr de vouloir supprimer la sous-catégorie <strong>« {subCategoryToDelete.nom} »</strong> ?
              </p>

              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fee2e2',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  marginBottom: '20px',
                  fontSize: '13px',
                  color: '#991b1b',
                  lineHeight: 1.5,
                }}
              >
                Attention : les produits associés à cette sous-catégorie seront également supprimés. Cette action est irréversible.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  disabled={isDeletingSubCategory}
                  onClick={() => setSubCategoryToDelete(null)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    background: 'var(--soft, #f1f5f9)',
                    color: 'var(--ink, #0f172a)',
                    border: '1px solid var(--line, #e2e8f0)',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: isDeletingSubCategory ? 'not-allowed' : 'pointer',
                  }}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={isDeletingSubCategory}
                  onClick={handleConfirmDeleteSousCategory}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    background: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: isDeletingSubCategory ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    opacity: isDeletingSubCategory ? 0.7 : 1,
                  }}
                >
                  {isDeletingSubCategory ? 'Suppression...' : 'Supprimer définitivement'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VUE 2 : CRÉATION OU MODIFICATION DE PRODUIT (PAGE INTÉGRÉE BIEN AÉRÉE)
  // =========================================================================
  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <button
          type="button"
          onClick={() => setViewMode('list')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--mut)',
            fontSize: '15px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '18px',
            padding: '6px 0',
          }}
        >
          <span>← Retour à la liste des produits</span>
        </button>

        <div style={{ marginBottom: '28px' }}>
          <h1 className="admin-header-title">
            {viewMode === 'edit' ? `Modifier le produit : ${form.nom || 'Article'}` : 'Créer un Nouveau Produit'}
          </h1>
          <p className="admin-header-sub">
            {viewMode === 'edit'
              ? 'Mettez à jour les caractéristiques, les prix, les conditions de versement, photos et vidéo.'
              : 'Renseignez les détails du produit, sa catégorie, sa sous-catégorie et ses paramètres financiers.'}
          </p>
        </div>

        <form onSubmit={handleSaveProduct} noValidate>
          {/* SECTION 1 : INFORMATIONS GÉNÉRALES & CLASSIFICATION */}
          <div className="admin-panel" style={{ padding: '32px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--r)' }} />
              1. Informations Générales & Classification
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>
              {/* Nom de l'article */}
              <div className="admin-field" style={{ margin: 0 }}>
                <label style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px', display: 'block' }}>
                  Nom de l'article *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Moto Haojue 110cc, iPhone 16 Pro, Sac de Riz 50kg..."
                  value={form.nom}
                  onChange={(e) => {
                    setForm({ ...form, nom: e.target.value });
                    if (errors.nom) setErrors((prev) => ({ ...prev, nom: null }));
                  }}
                  style={{
                    width: '100%',
                    padding: '13px 16px',
                    borderRadius: '12px',
                    border: errors.nom ? '2px solid #dc2626' : '1.5px solid var(--line)',
                    fontSize: '15px',
                  }}
                />
                {errors.nom && (
                  <span style={{ color: '#dc2626', fontSize: '13px', fontWeight: 600, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ⚠ {errors.nom}
                  </span>
                )}
              </div>

              {/* Catégorie parente */}
              <div className="admin-field" style={{ margin: 0 }}>
                <label style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px', display: 'block' }}>
                  Catégorie du produit *
                </label>
                <select
                  value={form.categorie_id}
                  onChange={handleCategoryChange}
                  style={{
                    width: '100%',
                    padding: '13px 16px',
                    borderRadius: '12px',
                    border: errors.categorie_id ? '2px solid #dc2626' : '1.5px solid var(--line)',
                    fontSize: '15px',
                  }}
                >
                  <option value="">Sélectionnez une catégorie...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom}
                    </option>
                  ))}
                </select>
                {errors.categorie_id && (
                  <span style={{ color: '#dc2626', fontSize: '13px', fontWeight: 600, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ⚠ {errors.categorie_id}
                  </span>
                )}
              </div>

              {/* Sous-catégorie filtrée automatiquement */}
              <div className="admin-field" style={{ margin: 0 }}>
                <label style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px', display: 'block' }}>
                  Sous-Catégorie (filtrée selon la catégorie) *
                </label>
                <select
                  value={form.sous_categorie_id}
                  disabled={!form.categorie_id || availableSubCategories.length === 0}
                  onChange={(e) => {
                    setForm({ ...form, sous_categorie_id: e.target.value });
                    if (errors.sous_categorie_id) setErrors((prev) => ({ ...prev, sous_categorie_id: null }));
                  }}
                  style={{
                    width: '100%',
                    padding: '13px 16px',
                    borderRadius: '12px',
                    border: errors.sous_categorie_id ? '2px solid #dc2626' : '1.5px solid var(--line)',
                    fontSize: '15px',
                    background: (!form.categorie_id || availableSubCategories.length === 0) ? 'var(--bg)' : 'var(--card)',
                    cursor: (!form.categorie_id || availableSubCategories.length === 0) ? 'not-allowed' : 'pointer',
                  }}
                >
                  {!form.categorie_id ? (
                    <option value="">-- Sélectionnez d'abord une catégorie --</option>
                  ) : availableSubCategories.length === 0 ? (
                    <option value="">Aucune sous-catégorie pour cette catégorie</option>
                  ) : (
                    <>
                      <option value="">Sélectionnez une sous-catégorie...</option>
                      {availableSubCategories.map((sc) => (
                        <option key={sc.id} value={sc.id}>
                          {sc.nom}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                {errors.sous_categorie_id && (
                  <span style={{ color: '#dc2626', fontSize: '13px', fontWeight: 600, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ⚠ {errors.sous_categorie_id}
                  </span>
                )}
              </div>
            </div>

            <div className="admin-field" style={{ margin: '0 0 20px' }}>
              <label style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px', display: 'block' }}>
                Description détaillée de l'article
              </label>
              <textarea
                rows={3}
                placeholder="Précisez les caractéristiques, garanties, état neuf et fonctionnalités..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                style={{ width: '100%', padding: '13px 16px', borderRadius: '12px', border: '1.5px solid var(--line)', fontSize: '15px', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
              <div className="admin-field" style={{ margin: 0 }}>
                <label style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px', display: 'block' }}>
                  Stock disponible *
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(e) => {
                    setForm({ ...form, stock: e.target.value });
                    if (errors.stock) setErrors((prev) => ({ ...prev, stock: null }));
                  }}
                  style={{
                    width: '100%',
                    padding: '13px 16px',
                    borderRadius: '12px',
                    border: errors.stock ? '2px solid #dc2626' : '1.5px solid var(--line)',
                    fontSize: '15px',
                  }}
                />
                {errors.stock && (
                  <span style={{ color: '#dc2626', fontSize: '13px', fontWeight: 600, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ⚠ {errors.stock}
                  </span>
                )}
              </div>

              <div className="admin-field" style={{ margin: 0 }}>
                <label style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px', display: 'block' }}>
                  Durée de disponibilité de l'article (mois) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="36"
                  value={form.duree}
                  onChange={(e) => {
                    setForm({ ...form, duree: e.target.value });
                    if (errors.duree) setErrors((prev) => ({ ...prev, duree: null }));
                  }}
                  style={{
                    width: '100%',
                    padding: '13px 16px',
                    borderRadius: '12px',
                    border: errors.duree ? '2px solid #dc2626' : '1.5px solid var(--line)',
                    fontSize: '15px',
                  }}
                />
                <span style={{ fontSize: '12px', color: 'var(--mut)', marginTop: '4px', display: 'block' }}>
                  Période pendant laquelle l'offre reste disponible au catalogue sur Takapay (distincte de la durée de paiement client).
                </span>
                {errors.duree && (
                  <span style={{ color: '#dc2626', fontSize: '13px', fontWeight: 600, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ⚠ {errors.duree}
                  </span>
                )}
              </div>

              <div className="admin-field" style={{ margin: 0 }}>
                <label style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px', display: 'block' }}>
                  Référence produit (optionnelle)
                </label>
                <input
                  type="text"
                  placeholder="Ex: PRD-0941"
                  value={form.reference}
                  onChange={(e) => setForm({ ...form, reference: e.target.value })}
                  style={{ width: '100%', padding: '13px 16px', borderRadius: '12px', border: '1.5px solid var(--line)', fontSize: '15px' }}
                />
              </div>
            </div>

            {/* GESTION MULTI-COULEURS ET DÉCLINAISONS (STANDARD ET PRIX DIFFÉRENTS) */}
            <div style={{ marginTop: '24px', padding: '22px', background: 'var(--bg)', borderRadius: '16px', border: '1.5px solid var(--line)' }}>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '16px', fontWeight: 800, color: 'var(--ink)' }}>
                  Couleurs & Déclinaisons de l'article
                </label>
                <span style={{ fontSize: '13px', color: 'var(--mut)', display: 'block', marginTop: '2px' }}>
                  Définissez les couleurs disponibles. Séparez les couleurs vendues au tarif normal et celles bénéficiant d'un prix spécifique.
                </span>
              </div>

              {/* 1. COULEURS AU TARIF STANDARD */}
              <div style={{ marginBottom: '20px', padding: '16px', background: 'var(--card)', borderRadius: '14px', border: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)' }}>
                      1. Couleurs au tarif standard ({form.prix_total ? `${Number(form.prix_total).toLocaleString('fr-FR')} F` : 'Prix de base'})
                    </span>
                    <small style={{ display: 'block', color: 'var(--mut)', fontSize: '12px', marginTop: '2px' }}>
                      Ces couleurs partagent le prix normal de vente défini dans la section financière ci-dessous.
                    </small>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddStandardColor}
                    className="admin-btn"
                    style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '8px' }}
                  >
                    + Ajouter couleur standard
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                  {couleursStandard.map((c, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'var(--bg)',
                        padding: '6px 10px',
                        borderRadius: '10px',
                        border: '1px solid var(--line)',
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Ex: Noir, Blanc..."
                        value={c.nom}
                        onChange={(e) => handleStandardColorChange(idx, e.target.value)}
                        style={{
                          flex: 1,
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--line)',
                          fontSize: '13px',
                          background: 'var(--card)',
                        }}
                      />
                      {couleursStandard.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveStandardColor(idx)}
                          style={{
                            background: '#fee2e2',
                            color: '#dc2626',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 700,
                          }}
                          title="Supprimer cette couleur"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. COULEURS AVEC TARIF SPÉCIFIQUE */}
              <div style={{ marginBottom: '16px', padding: '16px', background: 'var(--card)', borderRadius: '14px', border: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)' }}>
                      2. Couleurs avec tarif spécifique (prix différent)
                    </span>
                    <small style={{ display: 'block', color: 'var(--mut)', fontSize: '12px', marginTop: '2px' }}>
                      Renseignez ici uniquement les déclinaisons dont le prix est différent (ex: finition titane, or, etc.).
                    </small>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSpecificColor}
                    className="admin-btn"
                    style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '8px' }}
                  >
                    + Ajouter couleur avec prix différent
                  </button>
                </div>

                {couleursSpecifiques.length === 0 ? (
                  <div style={{ padding: '12px', textAlign: 'center', color: 'var(--mut)', fontSize: '12px', background: 'var(--bg)', borderRadius: '8px', border: '1px dashed var(--line)' }}>
                    Aucune couleur à prix spécifique. Toutes les couleurs utilisent le prix standard.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {couleursSpecifiques.map((c, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1.2fr 1fr auto',
                          gap: '12px',
                          alignItems: 'center',
                          background: 'var(--bg)',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: '1px solid var(--line)',
                        }}
                      >
                        <div>
                          <label style={{ fontSize: '11px', color: 'var(--mut)', display: 'block', marginBottom: '3px', fontWeight: 600 }}>
                            Nom de la déclinaison *
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: Titane Naturel, Or 24K..."
                            value={c.nom}
                            onChange={(e) => handleSpecificColorChange(idx, 'nom', e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--line)', fontSize: '13px', background: 'var(--card)' }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '11px', color: 'var(--mut)', display: 'block', marginBottom: '3px', fontWeight: 600 }}>
                            Prix spécifique (FCFA) *
                          </label>
                          <input
                            type="number"
                            min="0"
                            placeholder="Ex: 520000"
                            value={c.prix}
                            onChange={(e) => handleSpecificColorChange(idx, 'prix', e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--line)', fontSize: '13px', background: 'var(--card)', fontWeight: 700 }}
                          />
                        </div>

                        <div style={{ paddingTop: '16px' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveSpecificColor(idx)}
                            style={{
                              background: '#fee2e2',
                              color: '#dc2626',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '8px 12px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: 700,
                            }}
                            title="Supprimer cette déclinaison"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              </div>
          </div>

          {/* SECTION 2 : TARIFICATION & PARAMÈTRES FINANCIERS */}
          <div className="admin-panel" style={{ padding: '32px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--y)' }} />
              2. Tarification & Modalités Financières
            </h2>

            {/* SÉLECTEUR DE MODE DE PAIEMENT (2 MODES UNIQUEMENT : ÉCHELONNÉ OU LIBRE) */}
            <div style={{ marginBottom: '22px' }}>
              <label style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px', display: 'block' }}>
                Mode de Versement / Cotisation *
              </label>
              <select
                value={form.mode_paiement === 'libre' ? 'libre' : 'echelonne'}
                onChange={(e) => setForm({ ...form, mode_paiement: e.target.value })}
                style={{
                  width: '100%',
                  padding: '13px 16px',
                  borderRadius: '12px',
                  border: '1.5px solid var(--line)',
                  fontSize: '15px',
                  fontWeight: 600,
                  background: 'var(--card)',
                  color: 'var(--ink)',
                }}
              >
                <option value="echelonne">Paiement échelonné (versements périodiques planifiés)</option>
                <option value="libre">Cotisation libre (à son rythme, sans durée finale imposée)</option>
              </select>
            </div>

            {/* SI MODE LIBRE : PARAMÈTRES ADAPTÉS */}
            {form.mode_paiement === 'libre' ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                  <div className="admin-field" style={{ margin: 0 }}>
                    <label style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px', display: 'block' }}>
                      Prix Total de Vente (FCFA) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Ex: 450000"
                      value={form.prix_total}
                      onChange={(e) => {
                        setForm({ ...form, prix_total: e.target.value });
                        if (errors.prix_total) setErrors((prev) => ({ ...prev, prix_total: null }));
                      }}
                      style={{
                        width: '100%',
                        padding: '13px 16px',
                        borderRadius: '12px',
                        border: errors.prix_total ? '2px solid #dc2626' : '1.5px solid var(--line)',
                        fontSize: '15px',
                        fontWeight: 700,
                      }}
                    />
                    {errors.prix_total && (
                      <span style={{ color: '#dc2626', fontSize: '13px', fontWeight: 600, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        ⚠ {errors.prix_total}
                      </span>
                    )}
                  </div>

                  <div className="admin-field" style={{ margin: 0 }}>
                    <label style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px', display: 'block' }}>
                      Prix d'Achat Comptant / Cash (FCFA)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder={`Ex: ${form.prix_total ? Math.round(Number(form.prix_total) * 0.95) : 400000} (Si différent du prix total)`}
                      value={form.prix_cash}
                      onChange={(e) => setForm({ ...form, prix_cash: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '13px 16px',
                        borderRadius: '12px',
                        border: '1.5px solid var(--line)',
                        fontSize: '15px',
                        fontWeight: 700,
                        color: '#16a34a',
                      }}
                    />
                    <span style={{ fontSize: '12px', color: 'var(--mut)', marginTop: '4px', display: 'block' }}>
                      Tarif appliqué si le client choisit de payer comptant (Cash direct).
                    </span>
                  </div>

                  <div className="admin-field" style={{ margin: 0 }}>
                    <label style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px', display: 'block' }}>
                      1 er versement minimum pour ouvrir la cagnotte (FCFA)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder={`Suggéré: ${autoMinStart} FCFA`}
                      value={form.prix_minimum}
                      onChange={(e) => setForm({ ...form, prix_minimum: e.target.value })}
                      style={{ width: '100%', padding: '13px 16px', borderRadius: '12px', border: '1.5px solid var(--line)', fontSize: '15px' }}
                    />
                  </div>

                  <div className="admin-field" style={{ margin: 0, background: '#f8fafc', padding: '14px 16px', borderRadius: '12px', border: '1.5px dashed #cbd5e1' }}>
                    <label style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px', display: 'block', color: '#334155' }}>
                      Seuil de Récupération du Produit
                    </label>
                    <span style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5, display: 'block' }}>
                      ✓ Mode cotisation libre : Aucun seuil à atteindre pour récupérer le produit. Le client verse à son rythme en toute liberté.
                    </span>
                  </div>

                  <div className="admin-field" style={{ margin: 0 }}>
                    <label style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px', display: 'block' }}>
                      Promotion Associée
                    </label>
                    <select
                      value={form.promotion_id}
                      onChange={(e) => setForm({ ...form, promotion_id: e.target.value })}
                      style={{ width: '100%', padding: '13px 16px', borderRadius: '12px', border: '1.5px solid var(--line)', fontSize: '15px' }}
                    >
                      <option value="">Aucune promotion</option>
                      {promotions.map((pr) => (
                        <option key={pr.id} value={pr.id}>
                          {pr.titre} (-{pr.pourcentage_promo}%)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            ) : (
              /* SI MODE ÉCHELONNÉ : PARAMÈTRES COMPLETS AVEC DURÉE DE PAIEMENT CLIENT ESTIMÉE ET VERSEMENT PÉRIODIQUE */
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                  <div className="admin-field" style={{ margin: 0 }}>
                    <label style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px', display: 'block' }}>
                      Prix Total de Vente (FCFA) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Ex: 450000"
                      value={form.prix_total}
                      onChange={(e) => {
                        setForm({ ...form, prix_total: e.target.value });
                        if (errors.prix_total) setErrors((prev) => ({ ...prev, prix_total: null }));
                      }}
                      style={{
                        width: '100%',
                        padding: '13px 16px',
                        borderRadius: '12px',
                        border: errors.prix_total ? '2px solid #dc2626' : '1.5px solid var(--line)',
                        fontSize: '15px',
                        fontWeight: 700,
                      }}
                    />
                    {errors.prix_total && (
                      <span style={{ color: '#dc2626', fontSize: '13px', fontWeight: 600, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        ⚠ {errors.prix_total}
                      </span>
                    )}
                  </div>

                  <div className="admin-field" style={{ margin: 0 }}>
                    <label style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px', display: 'block' }}>
                      Prix d'Achat Comptant / Cash (FCFA)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder={`Ex: ${form.prix_total ? Math.round(Number(form.prix_total) * 0.95) : 400000} (Si différent du prix total)`}
                      value={form.prix_cash}
                      onChange={(e) => setForm({ ...form, prix_cash: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '13px 16px',
                        borderRadius: '12px',
                        border: '1.5px solid var(--line)',
                        fontSize: '15px',
                        fontWeight: 700,
                        color: '#16a34a',
                      }}
                    />
                    <span style={{ fontSize: '12px', color: 'var(--mut)', marginTop: '4px', display: 'block' }}>
                      Tarif appliqué si le client choisit de payer comptant (Cash direct).
                    </span>
                  </div>

                  <div className="admin-field" style={{ margin: 0 }}>
                    <label style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px', display: 'block' }}>
                      1 er versement minimum (FCFA)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder={`Suggéré: ${autoMinStart} FCFA`}
                      value={form.prix_minimum}
                      onChange={(e) => setForm({ ...form, prix_minimum: e.target.value })}
                      style={{ width: '100%', padding: '13px 16px', borderRadius: '12px', border: '1.5px solid var(--line)', fontSize: '15px' }}
                    />
                  </div>

                  <div className="admin-field" style={{ margin: 0 }}>
                    <label style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px', display: 'block' }}>
                      Versement Périodique Échelonné (FCFA)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder={`Suggéré: ${autoEch} FCFA`}
                      value={form.prix_echelonne}
                      onChange={(e) => setForm({ ...form, prix_echelonne: e.target.value })}
                      style={{ width: '100%', padding: '13px 16px', borderRadius: '12px', border: '1.5px solid var(--line)', fontSize: '15px', fontWeight: 600 }}
                    />
                    <span style={{ fontSize: '12px', color: 'var(--mut)', marginTop: '4px', display: 'block' }}>
                      💡 Fin estimée calculée mathématiquement : <strong>~{autoDureeEstimeeMois} {form.frequence === 'hebdomadaire' ? 'semaines' : form.frequence === 'journaliere' ? 'jours' : 'mois'}</strong> pour solder l'article selon le versement périodique saisi.
                    </span>
                  </div>

                  <div className="admin-field" style={{ margin: 0 }}>
                    <label style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px', display: 'block' }}>
                      Fréquence de Versement
                    </label>
                    <select
                      value={form.frequence}
                      onChange={(e) => setForm({ ...form, frequence: e.target.value })}
                      style={{ width: '100%', padding: '13px 16px', borderRadius: '12px', border: '1.5px solid var(--line)', fontSize: '15px' }}
                    >
                      <option value="mensuelle">Mensuelle</option>
                      <option value="bimensuelle">Bimensuelle (tous les 15 jours)</option>
                      <option value="hebdomadaire">Hebdomadaire</option>
                      <option value="journaliere">Journalière</option>
                    </select>
                  </div>

                  <div className="admin-field" style={{ margin: 0 }}>
                    <label style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px', display: 'block' }}>
                      Seuil de Livraison Anticipée (FCFA)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder={`Suggéré: ${autoSeuil} FCFA (Dès 40%)`}
                      value={form.seuil_livraison}
                      onChange={(e) => setForm({ ...form, seuil_livraison: e.target.value })}
                      style={{ width: '100%', padding: '13px 16px', borderRadius: '12px', border: '1.5px solid var(--line)', fontSize: '15px', fontWeight: 600 }}
                    />
                    <span style={{ fontSize: '12px', color: 'var(--mut)', marginTop: '4px', display: 'block' }}>
                      Montant à partir duquel le client est éligible pour récupérer son produit.
                    </span>
                  </div>

                  <div className="admin-field" style={{ margin: 0 }}>
                    <label style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px', display: 'block' }}>
                      Promotion Associée
                    </label>
                    <select
                      value={form.promotion_id}
                      onChange={(e) => setForm({ ...form, promotion_id: e.target.value })}
                      style={{ width: '100%', padding: '13px 16px', borderRadius: '12px', border: '1.5px solid var(--line)', fontSize: '15px' }}
                    >
                      <option value="">Aucune promotion</option>
                      {promotions.map((pr) => (
                        <option key={pr.id} value={pr.id}>
                          {pr.titre} (-{pr.pourcentage_promo}%)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* SECTION 3 : GALERIE PHOTOS (FICHIERS UNIQUEMENT) */}
          <div className="admin-panel" style={{ padding: '32px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#3b82f6' }} />
              3. Photos du Produit (Téléversement de fichiers)
            </h2>
            <p style={{ margin: '0 0 20px', fontSize: '14px', color: 'var(--mut)' }}>
              Sélectionnez les photos du produit depuis votre ordinateur ou téléphone (JPG, PNG, WEBP). L'insertion d'URL a été retirée afin de garantir des visuels toujours fonctionnels.
            </p>

            {/* Zone de téléversement Drag & Drop / Clic */}
            <label
              htmlFor="product-file-upload-input"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px dashed var(--line)',
                borderRadius: '16px',
                padding: '36px 20px',
                textAlign: 'center',
                background: 'var(--bg)',
                cursor: 'pointer',
                transition: 'border-color 0.2s ease, background 0.2s ease',
                marginBottom: '20px',
              }}
            >
              <input
                id="product-file-upload-input"
                type="file"
                accept="image/*"
                multiple
                onChange={handleMultipleFilesSelect}
                style={{ display: 'none' }}
              />
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>📸</div>
              <strong style={{ fontSize: '16px', color: 'var(--ink)' }}>
                Cliquez pour choisir des photos ou glissez-déposez ici
              </strong>
              <span style={{ fontSize: '13px', color: 'var(--mut)', marginTop: '4px' }}>
                Vous pouvez sélectionner plusieurs photos à la fois.
              </span>
            </label>

            {/* Vignettes des photos */}
            {images.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '14px' }}>
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: 'relative',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      border: img.is_principal ? '2px solid var(--r)' : '1px solid var(--line)',
                      background: '#000',
                      aspectRatio: '1',
                    }}
                  >
                    <img
                      src={img.chemin}
                      alt={`Photo ${idx + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />

                    {/* Badge Principale */}
                    <button
                      type="button"
                      onClick={() => handleSetPrincipalImage(idx)}
                      title={img.is_principal ? 'Photo principale' : 'Définir comme photo principale'}
                      style={{
                        position: 'absolute',
                        top: '6px',
                        left: '6px',
                        background: img.is_principal ? 'var(--r)' : 'rgba(0,0,0,0.6)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '3px 7px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {img.is_principal ? '★ Principale' : '☆ Définir'}
                    </button>

                    {/* Bouton Supprimer */}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      title="Supprimer cette photo"
                      style={{
                        position: 'absolute',
                        top: '6px',
                        right: '6px',
                        background: 'rgba(220, 38, 38, 0.85)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        width: '26px',
                        height: '26px',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: '14px',
                        cursor: 'pointer',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 4 : VIDÉO DU PRODUIT (OPTIONNEL) */}
          <div className="admin-panel" style={{ padding: '32px', marginBottom: '28px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#8b5cf6' }} />
              4. Vidéo du Produit (Optionnel)
            </h2>
            <p style={{ margin: '0 0 20px', fontSize: '14px', color: 'var(--mut)' }}>
              Ajoutez une vidéo de présentation, un test ou une démonstration de l'article pour inciter davantage de clients à cotiser (Formats MP4, WebM, MOV jusqu'à 80 Mo).
            </p>

            {video ? (
              <div
                style={{
                  background: 'var(--bg)',
                  border: '1.5px solid var(--line)',
                  borderRadius: '16px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  maxWidth: '520px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: '14px', display: 'block', color: 'var(--ink)' }}>
                      🎬 {video.nom_fichier || 'Vidéo chargée'}
                    </strong>
                    {video.taille && <span style={{ fontSize: '12px', color: 'var(--mut)' }}>Taille: {video.taille}</span>}
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveVideo}
                    style={{
                      background: '#fee2e2',
                      color: '#dc2626',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>Supprimer la vidéo</span>
                  </button>
                </div>

                <video
                  src={video.chemin}
                  controls
                  style={{
                    width: '100%',
                    maxHeight: '260px',
                    borderRadius: '12px',
                    background: '#000',
                  }}
                />
              </div>
            ) : (
              <label
                htmlFor="product-video-upload-input"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px dashed var(--line)',
                  borderRadius: '16px',
                  padding: '30px 20px',
                  textAlign: 'center',
                  background: 'var(--bg)',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s ease, background 0.2s ease',
                }}
              >
                <input
                  id="product-video-upload-input"
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,video/*"
                  onChange={handleVideoSelect}
                  style={{ display: 'none' }}
                />
                <div style={{ fontSize: '34px', marginBottom: '8px' }}>🎥</div>
                <strong style={{ fontSize: '15px', color: 'var(--ink)' }}>
                  Sélectionner un fichier vidéo (Optionnel)
                </strong>
                <span style={{ fontSize: '13px', color: 'var(--mut)', marginTop: '4px' }}>
                  Si vous n'avez pas de vidéo pour ce produit, laissez cette section vide.
                </span>
              </label>
            )}
          </div>

          {/* BARRE DE VALIDATION / ACTIONS */}
          <div
            style={{
              display: 'flex',
              gap: '14px',
              justifyContent: 'flex-end',
              alignItems: 'center',
              padding: '20px 0',
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="admin-btn secondary"
              style={{
                padding: '13px 28px',
                fontSize: '15px',
                background: 'var(--card)',
                color: 'var(--ink)',
                border: '1.5px solid var(--line)',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="admin-btn"
              style={{ padding: '13px 32px', fontSize: '16px', fontWeight: 700 }}
            >
              {submitting
                ? 'Enregistrement...'
                : viewMode === 'edit'
                ? 'Enregistrer les modifications'
                : 'Créer le produit'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // =========================================================================
  // VUE 3 : LISTE DES PRODUITS (PAGE PRINCIPALE AVEC CLIC LIGNE & SUPPRESSION)
  // =========================================================================
  return (
    <div>
      {/* Barre d'action supérieure */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 className="admin-header-title">Catalogue des Produits</h1>
          <p className="admin-header-sub">
            Gérez les articles, stocks, paramètres de cotisations et offres promotionnelles
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="admin-btn secondary"
            onClick={() => setViewMode('categories')}
            style={{
              padding: '12px 20px',
              fontSize: '15px',
              background: 'var(--soft)',
              color: 'var(--r)',
              border: '1.5px solid var(--r)',
              borderRadius: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            <AdminIcon name="layers" size={19} />
            <span>Gérer Catégories</span>
          </button>

          <button
            type="button"
            className="admin-btn"
            onClick={handleOpenCreate}
            style={{ padding: '12px 22px', fontSize: '15px', fontWeight: 700 }}
          >
            <AdminIcon name="box" size={19} />
            <span>+ Nouveau Produit</span>
          </button>
        </div>
      </div>

      {/* Filtres de recherche */}
      <div className="admin-panel" style={{ marginBottom: '20px', padding: '16px 20px', display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Rechercher par nom, référence..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: '220px',
            padding: '12px 16px',
            borderRadius: '10px',
            border: '1.5px solid var(--line)',
            background: 'var(--bg)',
            color: 'var(--ink)',
            font: 'inherit',
            fontSize: '14px',
          }}
        />

        <select
          value={selectedCat}
          onChange={(e) => setSelectedCat(e.target.value)}
          style={{
            padding: '12px 16px',
            borderRadius: '10px',
            border: '1.5px solid var(--line)',
            background: 'var(--bg)',
            color: 'var(--ink)',
            fontSize: '14px',
            font: 'inherit',
          }}
        >
          <option value="tous">Toutes les sous-catégories</option>
          {sousCategories.map((sc) => (
            <option key={sc.id} value={sc.id.toString()}>
              {sc.nom}
            </option>
          ))}
        </select>
      </div>

      {/* Tableau des produits */}
      <div className="admin-panel" style={{ padding: '24px' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--mut)', padding: '28px', fontSize: '15px' }}>Chargement des produits...</p>
        ) : filtered.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--mut)', padding: '28px', fontSize: '15px' }}>Aucun produit trouvé.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Article / Référence</th>
                  <th>Sous-Catégorie</th>
                  <th>Stock</th>
                  <th>Prix Total</th>
                  <th>Modalités de versement</th>
                  <th>Seuil Livr.</th>
                  <th>Promotion</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const param = item.parametre_produit || {};
                  const prixTotal = param.prix_total || 0;
                  const prixEch = param.prix_echelonne || 0;
                  const seuil = param.seuil_livraison || 0;
                  const promo = param.promotion;

                  const rawImgs = Array.isArray(item.image_produits) && item.image_produits.length > 0
                    ? item.image_produits
                    : Array.isArray(item.images) && item.images.length > 0
                    ? item.images
                    : [];
                  const principalImg = rawImgs.find((img) => img.is_principal) || rawImgs[0];
                  const imgSrc = principalImg
                    ? (principalImg.url || resolveImageUrl(principalImg.chemin || (typeof principalImg === 'string' ? principalImg : '')))
                    : (item.image ? resolveImageUrl(item.image) : null);

                  return (
                    <tr
                      key={item.id}
                      onClick={() => handleEditProduct(item)}
                      className="admin-table-row-clickable"
                      title="Cliquer pour modifier ce produit"
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {imgSrc ? (
                            <img
                              src={imgSrc}
                              alt={item.nom}
                              style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '8px',
                                objectFit: 'cover',
                                flexShrink: 0,
                                background: 'var(--soft)',
                                border: '1px solid var(--line)',
                              }}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '8px',
                                background: 'var(--soft)',
                                border: '1px solid var(--line)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--mut)',
                                flexShrink: 0,
                              }}
                            >
                              <AdminIcon name="box" size={20} />
                            </div>
                          )}
                          <div>
                            <strong style={{ fontSize: '15px', display: 'block' }}>{item.nom}</strong>
                            <span className="admin-sub-text">
                              Réf: {param.reference || `PRD-${item.id}`}
                              {item.video && ' · 🎥 Vidéo'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '14px', color: 'var(--ink)', fontWeight: 500 }}>
                          {item.sous_categorie?.nom || item.sous_categorie_nom || 'Général'}
                        </span>
                      </td>
                      <td>
                        <span className={`admin-badge ${item.stock > 5 ? 's1' : item.stock > 0 ? 's2' : 's3'}`}>
                          {item.stock} en stock
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, fontSize: '15px' }}>
                        {prixTotal.toLocaleString('fr-FR')} F
                      </td>
                      <td>
                        {param.mode_paiement === 'libre' ? (
                          <>
                            <span
                              className="admin-badge"
                              style={{
                                fontSize: '12px',
                                display: 'inline-block',
                                marginBottom: '4px',
                                background: '#e0f2fe',
                                color: '#0369a1',
                              }}
                            >
                              Cotisation Libre
                            </span>
                            <span className="admin-sub-text">
                              Dispo: {item.duree || 6} mois (sans fin imposée)
                            </span>
                          </>
                        ) : (
                          <>
                            <span style={{ fontSize: '13px', fontWeight: 600 }}>
                              {prixEch.toLocaleString('fr-FR')} F / {param.frequence || 'mois'}
                            </span>
                            <span className="admin-sub-text">
                              Dispo: {item.duree || 6} mois · Échéancier
                            </span>
                          </>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>
                          {seuil > 0 ? `${seuil.toLocaleString('fr-FR')} F` : 'Dès 40%'}
                        </span>
                      </td>
                      <td>
                        {promo ? (
                          <span className="admin-badge s2">
                            -{promo.pourcentage_promo}% Promo
                          </span>
                        ) : (
                          <span style={{ color: 'var(--mut)', fontSize: '13px' }}>Standard</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInitiateDelete(item);
                          }}
                          style={{
                            background: '#fee2e2',
                            color: '#dc2626',
                            border: 'none',
                            borderRadius: '8px',
                            width: '34px',
                            height: '34px',
                            padding: 0,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="Supprimer le produit"
                        >
                          <AdminIcon name="trash" size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal 1 : Signalement que le produit ne peut pas être supprimé car une cagnotte est en cours */}
      {blockedProduct && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            backdropFilter: 'blur(4px)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setBlockedProduct(null);
          }}
        >
          <div
            style={{
              background: 'var(--card, #ffffff)',
              borderRadius: '20px',
              maxWidth: '480px',
              width: '100%',
              padding: '28px',
              border: '1px solid var(--line, #e2e8f0)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: '#fef3c7',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px', color: 'var(--ink, #0f172a)' }}>
              Suppression impossible
            </h3>

            <p style={{ color: 'var(--ink, #334155)', fontSize: '14px', lineHeight: 1.5, marginBottom: '14px' }}>
              Le produit <strong>« {blockedProduct.nom} »</strong> ne peut pas être supprimé car <strong>une cagnotte est actuellement en cours</strong> chez un utilisateur.
            </p>

            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #fef3c7',
                borderRadius: '12px',
                padding: '12px 14px',
                marginBottom: '20px',
                fontSize: '13px',
                color: '#92400e',
                lineHeight: 1.5,
              }}
            >
              Pour garantir la sécurité des paiements déjà engagés, un produit associé à une cagnotte active ne peut pas être retiré de la base de données.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setBlockedProduct(null)}
                style={{
                  padding: '10px 22px',
                  borderRadius: '10px',
                  background: '#ffffff',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                }}
              >
                J'ai compris
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2 : Confirmation de suppression si le produit est réellement supprimable */}
      {productToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            backdropFilter: 'blur(4px)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) setProductToDelete(null);
          }}
        >
          <div
            style={{
              background: 'var(--card, #ffffff)',
              borderRadius: '20px',
              maxWidth: '480px',
              width: '100%',
              padding: '28px',
              border: '1px solid var(--line, #e2e8f0)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <AdminIcon name="trash" size={26} />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px', color: 'var(--ink, #0f172a)' }}>
              Confirmer la suppression
            </h3>

            <p style={{ color: 'var(--ink, #334155)', fontSize: '14px', lineHeight: 1.5, marginBottom: '14px' }}>
              Êtes-vous sûr de vouloir supprimer définitivement le produit <strong>« {productToDelete.nom} »</strong> ?
            </p>

            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fee2e2',
                borderRadius: '12px',
                padding: '12px 14px',
                marginBottom: '20px',
                fontSize: '13px',
                color: '#991b1b',
                lineHeight: 1.5,
              }}
            >
              Cette action est irréversible. Les images et paramètres tarifaires rattachés à ce produit seront définitivement supprimés.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setProductToDelete(null)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  background: 'var(--soft, #f1f5f9)',
                  color: 'var(--ink, #0f172a)',
                  border: '1px solid var(--line, #e2e8f0)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: isDeleting ? 0.7 : 1,
                }}
              >
                {isDeleting ? 'Suppression...' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
