<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cagnotte;
use App\Models\Commande;
use App\Models\Document;
use App\Models\Echeance;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AdminStatsController extends Controller
{
    public function stats(): JsonResponse
    {
        $now = now();
        $startOfMonth = $now->copy()->startOfMonth();

        // ---- KPIs ----
        $encaisseCeMois = (float) Transaction::whereIn('statut', ['succes', 'reussi'])
            ->where('date', '>=', $startOfMonth)
            ->sum('montant');

        $cagnottesActives = (int) Cagnotte::where('statut', 'active')->count();

        $documentsAValider = (int) Document::where('statut', 'en_attente')->count();

        $nouveauxUtilisateurs = (int) User::where('created_at', '>=', $startOfMonth)->count();

        // ---- 1. Flux Réel : Les 7 jours de CETTE SEMAINE (Lundi à Dimanche) ----
        $startOfWeek = $now->copy()->startOfWeek();
        $cetteSemaineJours = collect(range(0, 6))->map(function ($i) use ($startOfWeek) {
            $day = $startOfWeek->copy()->addDays($i);
            $start = $day->copy()->startOfDay();
            $end = $day->copy()->endOfDay();

            $cash = (float) Transaction::whereIn('statut', ['succes', 'reussi'])
                ->whereBetween('date', [$start, $end])
                ->where(function ($q) {
                    $q->where('type', 'paiement_livraison')
                      ->orWhere('type', 'commande_cash')
                      ->orWhere('moyen_paiement', 'livraison')
                      ->orWhereNull('cagnotte_id');
                })
                ->sum('montant');

            $cagnotte = (float) Transaction::whereIn('statut', ['succes', 'reussi'])
                ->whereBetween('date', [$start, $end])
                ->whereNotNull('cagnotte_id')
                ->whereNotIn('type', ['paiement_livraison', 'commande_cash'])
                ->sum('montant');

            $nomsJours = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

            return [
                'jour'     => $nomsJours[$i],
                'label'    => $nomsJours[$i] . ' ' . $day->format('d/m'),
                'date'     => $day->toDateString(),
                'cash'     => $cash,
                'cagnotte' => $cagnotte,
                'total'    => $cash + $cagnotte,
                'attendu'  => $cash,
                'encaisse' => $cagnotte,
            ];
        });

        // ---- 2. Flux Réel : Les semaines du mois en cours ----
        $endOfMonth = $now->copy()->endOfMonth();
        $semaines = collect();
        $current = $startOfMonth->copy()->startOfWeek();
        $numSemaine = 1;

        while ($current->lte($endOfMonth)) {
            $weekStart = $current->copy();
            $weekEnd = $current->copy()->endOfWeek();

            $cash = (float) Transaction::whereIn('statut', ['succes', 'reussi'])
                ->whereBetween('date', [$weekStart, $weekEnd])
                ->where(function ($q) {
                    $q->where('type', 'paiement_livraison')
                      ->orWhere('type', 'commande_cash')
                      ->orWhere('moyen_paiement', 'livraison')
                      ->orWhereNull('cagnotte_id');
                })
                ->sum('montant');

            $cagnotte = (float) Transaction::whereIn('statut', ['succes', 'reussi'])
                ->whereBetween('date', [$weekStart, $weekEnd])
                ->whereNotNull('cagnotte_id')
                ->whereNotIn('type', ['paiement_livraison', 'commande_cash'])
                ->sum('montant');

            $isCurrent = $now->between($weekStart, $weekEnd);

            $semaines->push([
                'semaine'    => $isCurrent ? 'Cette sem.' : "S{$numSemaine}",
                'label'      => $isCurrent ? 'Cette semaine' : "Semaine {$numSemaine}",
                'periode'    => $weekStart->format('d/m') . ' au ' . $weekEnd->format('d/m'),
                'is_current' => $isCurrent,
                'cash'       => $cash,
                'cagnotte'   => $cagnotte,
                'total'      => $cash + $cagnotte,
                'attendu'    => $cash,
                'encaisse'   => $cagnotte,
            ]);

            $current->addWeek();
            $numSemaine++;
        }

        $totalEncaisse = (float) $semaines->sum('total');
        $tauxRecouvrement = $totalEncaisse > 0 ? 100 : 0;

        // ---- Documents à valider ----
        $documents = Document::where('statut', 'en_attente')
            ->latest()
            ->take(5)
            ->get()
            ->map(fn ($d) => [
                'id'          => $d->id,
                'utilisateur' => $d->utilisateur->nom ?? '—',
                'type'        => $d->type ?? '—',
                'url'         => $d->url ?? null,
                'statut'      => $d->statut,
                'created_at'  => $d->created_at?->toIso8601String(),
            ]);

        // ---- Derniers versements ----
        $derniersVersements = Transaction::with([
                'commande.utilisateur',
                'commande.commandeProduits.produit',
                'cagnotte.produit',
                'cagnotte.utilisateur',
            ])
            ->latest()
            ->take(5)
            ->get()
            ->map(function ($tx) {
                $commande = $tx->commande;
                $cagnotte = $tx->cagnotte;
                $isCash = $tx->type === 'paiement_livraison' 
                    || $tx->type === 'commande_cash' 
                    || $tx->moyen_paiement === 'livraison' 
                    || ($commande && $commande->type_commande === 'cash');

                $articleName = $cagnotte?->produit?->nom
                    ?? $commande?->commandeProduits?->first()?->produit?->nom
                    ?? '—';

                $clientName = $commande?->utilisateur?->nom
                    ?? $cagnotte?->utilisateur?->nom
                    ?? '—';

                $cagnotteNom = $isCash 
                    ? ($tx->moyen_paiement === 'livraison' ? 'À la livraison' : 'Comptant')
                    : ($cagnotte?->nom ?? ($tx->cagnotte_id ? "CG-{$tx->cagnotte_id}" : 'Cagnotte'));

                return [
                    'id'                 => $tx->id,
                    'is_cash'            => $isCash,
                    'commande_reference' => $commande?->reference
                        ?? $tx->reference_externe
                        ?? ($tx->commande_id ? "CMD-{$tx->commande_id}" : null),
                    'commande_id'        => $tx->commande_id,
                    'cagnotte_nom'       => $cagnotteNom,
                    'article'            => $articleName,
                    'montant'            => (float) $tx->montant,
                    'montant_cotise'     => (float) ($cagnotte?->montant_verse ?? 0),
                    'objectif'           => (float) ($cagnotte?->objectif_effectif ?? 0),
                    'progression'        => $isCash ? null : (int) ($cagnotte?->progression ?? 0),
                    'moyen_paiement'     => $tx->moyen_paiement,
                    'statut'             => $tx->statut,
                    'statut_label'       => $tx->isSuccessful()
                        ? 'Réussi'
                        : ($tx->statut === 'en_attente' ? 'En attente' : 'Échoué'),
                    'client'             => $clientName,
                    'nb_articles'        => $commande?->commandeProduits?->count() ?? 1,
                    'date'               => $tx->date?->toIso8601String(),
                ];
            });

        // ---- Indicateurs Réels à surveiller ----
        $cagnottesPretesALivrer = Cagnotte::where('statut', 'terminee')
            ->orWhere(function ($q) {
                $q->where('montant_verse', '>=', DB::raw('COALESCE(montant_objectif, prix_unitaire, 0)'))
                  ->where('montant_verse', '>', 0)
                  ->where('statut', '!=', 'livree')
                  ->where('statut', '!=', 'annulee');
            })->count();

        $commandesCashEnAttente = Commande::where(function ($q) {
                $q->where('type_commande', 'cash')
                  ->orWhere('mode_paiement', 'livraison');
            })
            ->whereNotIn('statut', ['terminee', 'livree', 'annulee'])
            ->count();

        $cagnottesAnnulation = Cagnotte::where('statut', 'annulation_demandee')->count();

        $aSurveiller = [
            ['label' => 'Cagnottes prêtes à livrer', 'valeur' => $cagnottesPretesALivrer, 'pulse' => $cagnottesPretesALivrer > 0],
            ['label' => 'Commandes Cash à préparer', 'valeur' => $commandesCashEnAttente, 'pulse' => $commandesCashEnAttente > 0],
            ['label' => 'Demandes d’annulation / remb.', 'valeur' => $cagnottesAnnulation, 'pulse' => $cagnottesAnnulation > 0],
        ];

        return response()->json([
            'kpis' => [
                'encaisse_ce_mois'      => $encaisseCeMois,
                'cagnottes_actives'     => $cagnottesActives,
                'documents_a_valider'   => $documentsAValider,
                'nouveaux_utilisateurs' => $nouveauxUtilisateurs,
            ],
            'recouvrement' => [
                'taux'          => $tauxRecouvrement,
                'semaines'      => $semaines->toArray(),
                'cette_semaine' => $cetteSemaineJours->toArray(),
                'total_semaine' => (float) $cetteSemaineJours->sum('total'),
                'total_mois'    => $totalEncaisse,
            ],
            'documents'           => $documents,
            'derniers_versements' => $derniersVersements,
            'a_surveiller'        => $aSurveiller,
        ]);
    }
}
