<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUserRequest;
use App\Http\Resources\DocumentResource;
use App\Http\Resources\LivreurResource;
use App\Http\Resources\ProduitResource;
use App\Http\Resources\UserResource;
use App\Models\Cagnotte;
use App\Models\Document;
use App\Models\Echeance;
use App\Models\ImageProduit;
use App\Models\Livreur;
use App\Models\ParametreProduit;
use App\Models\Produit;
use App\Models\Transaction;
use App\Models\User;
use App\Rules\ImageContent;
use App\Services\ImageStorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;

class AdminController extends Controller
{
    /**
     * Créer un compte administrateur ou livreur (Réservé Super Admin)
     */
    public function createAdminUser(StoreUserRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['statut_compte'] = 'actif';

        $user = User::create($data);

        return (new UserResource($user))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Modifier le statut d'un compte utilisateur (actif, inactif, suspendu)
     */
    public function updateUserStatus(Request $request, User $user): JsonResponse
    {
        $request->validate([
            'statut_compte' => ['required', 'string', 'in:actif,inactif,suspendu'],
        ]);

        $user->update([
            'statut_compte' => $request->statut_compte,
        ]);

        return response()->json([
            'message' => 'Statut du compte mis à jour avec succès.',
            'user' => new UserResource($user),
        ]);
    }

    /**
     * Valider ou refuser un document KYC
     */
    public function verifyDocument(Request $request, Document $document): JsonResponse
    {
        $request->validate([
            'statut' => ['required', 'string', 'in:valide,refuse,en_attente'],
            'motif' => ['nullable', 'string', 'max:500'],
        ]);

        $document->update([
            'statut' => $request->statut,
            'motif' => $request->motif,
            'verifier_par' => $request->user()->id,
            'date_modification' => now(),
        ]);

        return response()->json([
            'message' => 'Statut du document mis à jour.',
            'document' => new DocumentResource($document),
        ]);
    }

    /**
     * Modifier le statut d'un livreur (actif, inactif, en_livraison)
     */
    public function updateLivreurStatus(Request $request, Livreur $livreur): JsonResponse
    {
        $request->validate([
            'statut' => ['required', 'string', 'in:actif,inactif,en_livraison'],
        ]);

        $livreur->update([
            'statut' => $request->statut,
        ]);

        return response()->json([
            'message' => 'Statut du livreur mis à jour.',
            'livreur' => new LivreurResource($livreur),
        ]);
    }

    /**
     * Obtenir les statistiques et indicateurs pour le tableau de bord Admin
     */
    public function stats(): JsonResponse
    {
        $now = now();

        // KPIs réels (aucune valeur de secours inventée)
        $encaisseCeMois = (float) Transaction::where('statut', ['succes', 'reussi'])
            ->whereMonth('date', $now->month)
            ->whereYear('date', $now->year)
            ->sum('montant');

        $cagnottesActives = Cagnotte::whereIn('statut', ['active', 'en_cours'])->count();
        $documentsAValider = Document::where('statut', 'en_attente')->count();
        $nouveauxUtilisateurs = User::where('role', 'client')
            ->whereMonth('created_at', $now->month)
            ->whereYear('created_at', $now->year)
            ->count();

        // Recouvrement réel : échéances attendues vs payées, par semaine
        $echeances = Echeance::all(['date_prevue', 'montant_attendu', 'statut']);
        $attenduTotal = (float) $echeances->sum('montant_attendu');
        $encaisseTotal = (float) $echeances->where('statut', 'payee')->sum('montant_attendu');
        $tauxRecouvrement = $attenduTotal > 0 ? (int) round($encaisseTotal / $attenduTotal * 100) : 0;

        $semaines = $echeances
            ->groupBy(fn ($e) => $e->date_prevue ? Carbon::parse($e->date_prevue)->format('o-\WW') : 'inconnue')
            ->sort()
            ->take(8)
            ->map(fn ($groupe, $semaine) => [
                'semaine' => $semaine,
                'attendu' => (int) round((float) $groupe->sum('montant_attendu')),
                'encaisse' => (int) round((float) $groupe->where('statut', 'payee')->sum('montant_attendu')),
            ])
            ->values()
            ->all();

        // Documents réellement en attente de vérification
        $documents = Document::with('utilisateur')
            ->where('statut', 'en_attente')
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn ($d) => [
                'id' => $d->id,
                'nom' => $d->utilisateur ? trim($d->utilisateur->nom.' '.$d->utilisateur->prenom) : '—',
                'type' => $d->type,
                'statut' => $d->statut,
            ])
            ->all();

        // Derniers versements réels
        $derniersVersements = Transaction::with('cagnotte.produit')
            ->latest('date')
            ->limit(5)
            ->get()
            ->map(fn ($t) => [
                'id' => $t->id,
                'cagnotte' => $t->cagnotte_id !== null ? 'CG-'.str_pad((string) $t->cagnotte_id, 3, '0', STR_PAD_LEFT) : '—',
                'article' => $t->cagnotte?->produit?->nom ?? '—',
                'montant' => (float) $t->montant,
                'statut' => $t->statut,
                'date' => $t->date?->format('Y-m-d H:i'),
            ])
            ->all();

        return response()->json([
            'kpis' => [
                'encaisse_ce_mois' => (int) $encaisseCeMois,
                'cagnottes_actives' => $cagnottesActives,
                'documents_a_valider' => $documentsAValider,
                'nouveaux_utilisateurs' => $nouveauxUtilisateurs,
            ],
            'recouvrement' => [
                'taux' => $tauxRecouvrement,
                'semaines' => $semaines,
            ],
            'documents' => $documents,
            'derniers_versements' => $derniersVersements,
            'a_surveiller' => [
                'versements_en_retard' => Echeance::where('statut', '!=', 'payee')
                    ->whereDate('date_prevue', '<', $now->toDateString())
                    ->count(),
                'cagnottes_pretes_livraison' => Cagnotte::where('statut', 'en_cours')
                    ->whereColumn('montant_verse', '>=', 'prix_unitaire')
                    ->count(),
                'produits_en_rupture' => Produit::where('stock', '<=', 0)->count(),
            ],
        ]);
    }

    /**
     * Création complète d'un produit avec ses paramètres financiers et promotion
     */
    public function storeFullProduit(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'nom' => ['required', 'string', 'max:255'],
                'sous_categorie_id' => ['required', 'exists:sous_categories,id'],
                'description' => ['nullable', 'string'],
                'stock' => ['required', 'integer', 'min:0'],
                'duree' => ['required', 'integer', 'min:0'],
                'couleur' => ['nullable', 'string'],
                'video' => ['nullable'],
                'promotion_id' => ['nullable', 'exists:promotions,id'],
                'reference' => ['nullable', 'string', 'max:255'],
                'prix_total' => ['required', 'numeric', 'min:0'],
                'prix_minimum' => ['nullable', 'numeric', 'min:0'],
                'prix_echelonne' => ['nullable', 'numeric', 'min:0'],
                'prix_cash' => ['nullable', 'numeric', 'min:0'],
                'mode_paiement' => ['nullable', 'string', 'max:100'],
                'frequence' => ['nullable', 'string', 'max:100'],
                'seuil_livraison' => ['nullable', 'numeric', 'min:0'],
                'images' => ['nullable', 'array'],
                'images.*.chemin' => ['required', new ImageContent],
                'images.*.nom_fichier' => ['nullable', 'string', 'max:255'],
                'images.*.nom' => ['nullable', 'string', 'max:255'],
                'images.*.position' => ['nullable', 'integer'],
                'images.*.is_principal' => ['nullable', 'boolean'],
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            \Illuminate\Support\Facades\Log::warning('Échec validation storeFullProduit:', [
                'errors' => $e->errors(),
                'input' => $request->except(['images']),
            ]);
            throw $e;
        }

        return DB::transaction(function () use ($validated) {
            $videoPath = null;
            if (! empty($validated['video'])) {
                $rawVideo = is_array($validated['video']) ? ($validated['video']['chemin'] ?? null) : $validated['video'];
                if ($rawVideo && is_string($rawVideo)) {
                    if (str_starts_with($rawVideo, 'data:video/')) {
                        $comma = strpos($rawVideo, ',');
                        $header = substr($rawVideo, 0, $comma);
                        $binary = base64_decode(substr($rawVideo, $comma + 1), true);
                        if ($binary !== false) {
                            $ext = 'mp4';
                            if (preg_match('#data:video/(webm|ogg|quicktime|mp4)#i', $header, $m)) {
                                $ext = $m[1] === 'quicktime' ? 'mov' : $m[1];
                            }
                            $videoFileName = 'video_'.time().'_'.Str::random(6).'.'.$ext;
                            Storage::disk('public')->put('produits/'.$videoFileName, $binary);
                            Storage::disk('public')->put($videoFileName, $binary);
                            $videoPath = 'produits/'.$videoFileName;
                        }
                    } else {
                        $videoPath = $rawVideo;
                    }
                }
            }

            $produit = Produit::create([
                'nom' => $validated['nom'],
                'sous_categorie_id' => $validated['sous_categorie_id'],
                'description' => $validated['description'] ?? null,
                'stock' => $validated['stock'],
                'duree' => $validated['duree'],
                'couleur' => $validated['couleur'] ?? null,
                'video' => $videoPath,
            ]);

            $ref = ! empty($validated['reference']) ? $validated['reference'] : ('PRD-'.str_pad($produit->id, 4, '0', STR_PAD_LEFT));
            $prixTotal = (float) $validated['prix_total'];
            $dureeMois = max(1, (int) $produit->duree);
            $prixMin = isset($validated['prix_minimum']) && $validated['prix_minimum'] > 0 ? (float) $validated['prix_minimum'] : round($prixTotal * 0.1);
            $prixEch = isset($validated['prix_echelonne']) && $validated['prix_echelonne'] > 0 ? (float) $validated['prix_echelonne'] : round(($prixTotal - $prixMin) / $dureeMois);
            $prixCash = isset($validated['prix_cash']) && $validated['prix_cash'] > 0 ? (float) $validated['prix_cash'] : $prixTotal;
            $seuil = isset($validated['seuil_livraison']) && $validated['seuil_livraison'] > 0 ? (float) $validated['seuil_livraison'] : round($prixTotal * 0.4);

            ParametreProduit::create([
                'produit_id' => $produit->id,
                'promotion_id' => $validated['promotion_id'] ?? null,
                'reference' => $ref,
                'prix_total' => $prixTotal,
                'prix_minimum' => $prixMin,
                'prix_echelonne' => $prixEch,
                'prix_cash' => $prixCash,
                'mode_paiement' => $validated['mode_paiement'] ?? 'libre',
                'frequence' => $validated['frequence'] ?? 'mensuelle',
                'seuil_livraison' => $seuil,
            ]);

            if (! empty($validated['images'])) {
                $images = app(ImageStorageService::class);
                foreach ($validated['images'] as $idx => $img) {
                    $preferredName = $img['nom_fichier'] ?? $img['nom'] ?? null;
                    $savedPath = $images->process($img['chemin'] ?? null, 'produits', null, "images.{$idx}.chemin", $preferredName);
                    if ($savedPath) {
                        ImageProduit::create([
                            'produit_id' => $produit->id,
                            'chemin' => $savedPath,
                            'position' => isset($img['position']) ? (int) $img['position'] : ($idx + 1),
                            'is_principal' => ! empty($img['is_principal']),
                        ]);
                    }
                }
            }

            $produit->load(['sousCategorie.categorie', 'parametreProduit.promotion', 'imageProduits']);

            return (new ProduitResource($produit))
                ->response()
                ->setStatusCode(201);
        });
    }

    /**
     * Upload direct d'une vidéo produit
     */
    public function uploadVideo(Request $request): JsonResponse
    {
        $request->validate([
            'video' => ['required'],
        ]);

        $file = $request->file('video');
        if ($file) {
            $ext = $file->getClientOriginalExtension() ?: 'mp4';
            $filename = 'video_'.time().'_'.Str::random(6).'.'.$ext;
            $file->storeAs('produits', $filename, 'public');
            Storage::disk('public')->putFileAs('', $file, $filename);

            return response()->json([
                'success' => true,
                'chemin' => 'produits/'.$filename,
                'url' => Storage::disk('public')->url('produits/'.$filename),
                'nom_fichier' => $file->getClientOriginalName(),
            ]);
        }

        $raw = $request->input('video');
        if (is_string($raw) && str_starts_with($raw, 'data:video/')) {
            $comma = strpos($raw, ',');
            $header = substr($raw, 0, $comma);
            $binary = base64_decode(substr($raw, $comma + 1), true);
            if ($binary !== false) {
                $ext = 'mp4';
                if (preg_match('#data:video/(webm|ogg|quicktime|mp4)#i', $header, $m)) {
                    $ext = $m[1] === 'quicktime' ? 'mov' : $m[1];
                }
                $filename = 'video_'.time().'_'.Str::random(6).'.'.$ext;
                Storage::disk('public')->put('produits/'.$filename, $binary);
                Storage::disk('public')->put($filename, $binary);

                return response()->json([
                    'success' => true,
                    'chemin' => 'produits/'.$filename,
                    'url' => Storage::disk('public')->url('produits/'.$filename),
                    'nom_fichier' => $filename,
                ]);
            }
        }

        return response()->json(['error' => 'Format vidéo non supporté'], 422);
    }
}
