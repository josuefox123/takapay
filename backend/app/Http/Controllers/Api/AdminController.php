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
use App\Models\Notification;
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
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

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

        $newStatus = $request->statut_compte;

        $user->update([
            'statut_compte' => $newStatus,
        ]);

        // 1. Actions immédiates sur les sessions & verrous
        if ($newStatus === 'suspendu' || $newStatus === 'inactif') {
            // Révocation immédiate de toutes les sessions actives
            $user->tokens()->delete();
        } elseif ($newStatus === 'actif') {
            // Déverrouiller d'éventuels blocages de tentatives de connexion
            try {
                Cache::forget('login_lockout_'.$user->id);
                if ($user->email) {
                    Cache::forget('login_attempts_'.md5(strtolower($user->email)));
                }
                if ($user->telephone) {
                    Cache::forget('login_attempts_'.md5(preg_replace('/\D/', '', $user->telephone)));
                }
            } catch (\Throwable $e) {
                // Ignorer
            }
        }

        // 2. Notification in-app
        try {
            $titres = [
                'suspendu' => 'Suspension temporaire de votre compte',
                'inactif' => 'Désactivation de votre compte',
                'actif' => 'Votre compte est de nouveau actif',
            ];
            $messages = [
                'suspendu' => 'Votre compte TakaPay a été suspendu temporairement. Pour toute question ou réactivation, contactez le service client.',
                'inactif' => 'Votre compte a été marqué comme inactif. Vos données et cagnottes restent conservées en toute sécurité.',
                'actif' => 'Bonne nouvelle ! Votre compte TakaPay a été réactivé. Vous pouvez vous reconnecter avec vos identifiants habituels.',
            ];

            Notification::create([
                'utilisateur_id' => $user->id,
                'titre' => $titres[$newStatus] ?? 'Mise à jour de votre compte',
                'message' => $messages[$newStatus] ?? 'Le statut de votre compte a été modifié.',
                'type' => 'compte',
                'statut' => 'non_lu',
            ]);
        } catch (\Throwable $e) {
            Log::warning('Notification in-app statut compte non créée : ' . $e->getMessage());
        }

        // 3. Envoi d'un email d'état si l'utilisateur possède une adresse email valide
        $hasRealEmail = ! empty($user->email) && ! str_ends_with($user->email, '@client.takapay.bj');
        if ($hasRealEmail) {
            try {
                $prenomNom = trim("{$user->prenom} {$user->nom}") ?: 'Utilisateur';
                $dateHeure = now()->format('d/m/Y à H:i');

                if ($newStatus === 'suspendu') {
                    $subject = 'Alerte Sécurité : Suspension temporaire de votre compte TakaPay';
                    $content = "Bonjour {$prenomNom},\n\n"
                        . "Nous vous informons que votre compte TakaPay a été temporairement suspendu le {$dateHeure}.\n\n"
                        . "Par mesure de sécurité, toutes vos sessions actives ont été déconnectées et vos accès sont momentanément restreints.\n\n"
                        . "Si vous pensez qu'il s'agit d'une erreur ou pour demander la levée de cette suspension, veuillez contacter notre équipe d'assistance par email à support@takapay.bj ou par WhatsApp au +229 01 90 00 00.\n\n"
                        . "Cordialement,\n"
                        . "L'équipe TakaPay";
                } elseif ($newStatus === 'inactif') {
                    $subject = 'Information : Désactivation de votre compte TakaPay';
                    $content = "Bonjour {$prenomNom},\n\n"
                        . "Votre compte TakaPay a été marqué comme inactif le {$dateHeure}.\n\n"
                        . "Toutes vos informations, historiques d'achat et cagnottes restent sauvegardés en toute sécurité. Vos accès sont pour l'instant désactivés.\n\n"
                        . "Si vous souhaitez réactiver votre compte à l'avenir, contactez simplement notre service client à support@takapay.bj.\n\n"
                        . "Cordialement,\n"
                        . "L'équipe TakaPay";
                } else { // 'actif'
                    $subject = 'Bonne nouvelle : Votre compte TakaPay est réactivé !';
                    $content = "Bonjour {$prenomNom},\n\n"
                        . "Nous avons le plaisir de vous informer que votre compte TakaPay a été réactivé avec succès le {$dateHeure}.\n\n"
                        . "Vous pouvez dès à présent vous reconnecter sur la plateforme avec vos identifiants habituels (votre numéro de téléphone ou email, et votre mot de passe / code PIN existant).\n\n"
                        . "Nous vous remercions de votre fidélité.\n\n"
                        . "Cordialement,\n"
                        . "L'équipe TakaPay";
                }

                Mail::raw($content, function ($message) use ($user, $subject) {
                    $message->to($user->email)
                        ->subject($subject);
                });
            } catch (\Throwable $e) {
                Log::warning("Impossible d'envoyer l'email de changement de statut pour {$user->email} : " . $e->getMessage());
            }
        }

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
                'garantie_duree' => ['nullable', 'integer', 'min:1', 'max:1200', 'required_with:garantie_unite'],
                'garantie_unite' => ['nullable', 'string', 'in:jours,mois,ans', 'required_with:garantie_duree'],
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

        return DB::transaction(function () use ($validated, $request) {
            $videoPath = null;
            if (! empty($validated['video'])) {
                $rawVideo = is_array($validated['video']) ? ($validated['video']['chemin'] ?? null) : $validated['video'];
                if ($rawVideo && is_string($rawVideo)) {
                    if (str_starts_with($rawVideo, 'data:video/')) {
                        $comma = strpos($rawVideo, ',');
                        if ($comma !== false) {
                            $header = substr($rawVideo, 0, $comma);
                            $binary = base64_decode(substr($rawVideo, $comma + 1), true);
                            if ($binary !== false && strlen($binary) <= 52_428_800 && preg_match('#^data:video/(webm|ogg|quicktime|mp4)#i', $header, $m)) {
                                $ext = strtolower($m[1]) === 'quicktime' ? 'mov' : strtolower($m[1]);
                                $videoFileName = 'video_'.Str::uuid().'.'.$ext;
                                Storage::disk('public')->put('produits/'.$videoFileName, $binary);
                                $videoPath = 'produits/'.$videoFileName;
                            }
                        }
                    } elseif (!str_starts_with($rawVideo, 'blob:')) {
                        $clean = basename(str_replace('\\', '/', $rawVideo));
                        if (preg_match('#\.(mp4|webm|mov|ogg)$#i', $clean) || preg_match('#^https?://#i', $rawVideo)) {
                            $videoPath = str_starts_with($rawVideo, 'produits/') ? $rawVideo : (preg_match('#^https?://#i', $rawVideo) ? $rawVideo : 'produits/'.$clean);
                        }
                    }
                }
            }

            $produit = Produit::create([
                'admin_id' => $request->user()?->id,
                'nom' => trim(strip_tags($validated['nom'])),
                'sous_categorie_id' => $validated['sous_categorie_id'],
                'description' => isset($validated['description']) ? trim(strip_tags($validated['description'])) : null,
                'stock' => $validated['stock'],
                'duree' => $validated['duree'],
                'garantie_duree' => $validated['garantie_duree'] ?? null,
                'garantie_unite' => $validated['garantie_unite'] ?? null,
                'couleur' => isset($validated['couleur']) ? trim(strip_tags($validated['couleur'])) : null,
                'video' => $videoPath,
            ]);

            $ref = ! empty($validated['reference']) ? trim(strip_tags($validated['reference'])) : ('PRD-'.str_pad($produit->id, 4, '0', STR_PAD_LEFT));
            $prixTotal = (float) $validated['prix_total'];
            $dureeMois = max(1, (int) $produit->duree);
            $prixMin = isset($validated['prix_minimum']) && $validated['prix_minimum'] > 0 ? (float) $validated['prix_minimum'] : floor($prixTotal * 0.1);
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

            $produit->load(['admin', 'sousCategorie.categorie', 'parametreProduit.promotion', 'imageProduits']);

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
        if ($request->hasFile('video')) {
            $request->validate([
                'video' => [
                    'required',
                    'file',
                    'mimes:mp4,webm,mov,ogg',
                    'mimetypes:video/mp4,video/webm,video/quicktime,video/ogg',
                    'max:51200', // 50 Mo max
                ],
            ]);

            $file = $request->file('video');
            $allowedExtensions = ['mp4', 'webm', 'mov', 'ogg'];
            $fileExt = strtolower($file->extension() ?: '');
            $ext = in_array($fileExt, $allowedExtensions, true) ? $fileExt : 'mp4';

            $filename = 'video_'.Str::uuid().'.'.$ext;
            $file->storeAs('produits', $filename, 'public');

            return response()->json([
                'success' => true,
                'chemin' => 'produits/'.$filename,
                'url' => Storage::disk('public')->url('produits/'.$filename),
                'nom_fichier' => $filename,
            ]);
        }

        $raw = $request->input('video');
        if (is_string($raw) && str_starts_with($raw, 'data:video/')) {
            $comma = strpos($raw, ',');
            if ($comma === false) {
                return response()->json(['error' => 'Format vidéo non supporté'], 422);
            }

            $header = substr($raw, 0, $comma);
            $binary = base64_decode(substr($raw, $comma + 1), true);

            if ($binary === false || strlen($binary) > 52_428_800) {
                return response()->json(['error' => 'Vidéo invalide ou dépassant 50 Mo'], 422);
            }

            if (!preg_match('#^data:video/(webm|ogg|quicktime|mp4)#i', $header, $m)) {
                return response()->json(['error' => 'Type de vidéo non autorisé (mp4, webm, mov, ogg)'], 422);
            }

            $ext = strtolower($m[1]) === 'quicktime' ? 'mov' : strtolower($m[1]);
            $filename = 'video_'.Str::uuid().'.'.$ext;
            Storage::disk('public')->put('produits/'.$filename, $binary);

            return response()->json([
                'success' => true,
                'chemin' => 'produits/'.$filename,
                'url' => Storage::disk('public')->url('produits/'.$filename),
                'nom_fichier' => $filename,
            ]);
        }

        return response()->json(['error' => 'Format vidéo non supporté ou fichier manquant'], 422);
    }
}
