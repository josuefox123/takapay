<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cagnotte;
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

        // ---- Recouvrement hebdomadaire ----
        $semaines = collect(range(1, 4))->map(function ($n) use ($now) {
            $start = $now->copy()->startOfMonth()->addWeeks($n - 1);
            $end   = $start->copy()->endOfWeek();

            $attendu = (float) Echeance::whereBetween('date_prevue', [$start, $end])
                ->sum('montant_attendu');

            $encaisse = (float) Transaction::whereIn('statut', ['succes', 'reussi'])
                ->whereBetween('date', [$start, $end])
                ->sum('montant');

            return [
                'semaine'  => "S{$n}",
                'attendu'  => $attendu,
                'encaisse' => $encaisse,
            ];
        });

        $totalAttendu  = (float) $semaines->sum('attendu');
        $totalEncaisse = (float) $semaines->sum('encaisse');
        $tauxRecouvrement = $totalAttendu > 0
            ? (int) round(($totalEncaisse / $totalAttendu) * 100)
            : 0;

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
                'commande.commandeProduits',
                'cagnotte.produit',
            ])
            ->latest()
            ->take(5)
            ->get()
            ->map(function ($tx) {
                $commande = $tx->commande;
                $cagnotte = $tx->cagnotte;

                return [
                    'id'                 => $tx->id,
                    'commande_reference' => $commande?->reference
                        ?? ($tx->commande_id ? "CMD-{$tx->commande_id}" : null),
                    'commande_id'        => $tx->commande_id,
                    'cagnotte_nom'       => $cagnotte?->nom
                        ?? ($tx->cagnotte_id ? "CG-{$tx->cagnotte_id}" : null),
                    'article'            => $cagnotte?->produit?->nom,
                    'montant'            => (float) $tx->montant,
                    'montant_cotise'     => (float) ($cagnotte?->montant_verse ?? 0),
                    'objectif'           => (float) ($cagnotte?->objectif_effectif ?? 0),
                    'progression'        => (int) ($cagnotte?->progression ?? 0),
                    'moyen_paiement'     => $tx->moyen_paiement,
                    'statut'             => $tx->statut,
                    'statut_label'       => $tx->isSuccessful()
                        ? 'Réussi'
                        : ($tx->statut === 'en_attente' ? 'En attente' : 'Échoué'),
                    'client'             => $commande?->utilisateur?->nom,
                    'nb_articles'        => $commande?->commandeProduits?->count(),
                    'date'               => $tx->date?->toIso8601String(),
                ];
            });

        // ---- À surveiller ----
        $aSurveiller = Cagnotte::with(['produit', 'transactions.commande'])
            ->latest()
            ->take(10)
            ->get()
            ->filter(fn ($c) => $c->progression < 25)
            ->take(5)
            ->values()
            ->map(fn ($c) => [
                'id'            => $c->id,
                'nom'           => $c->nom,
                'montant_verse' => (float) $c->montant_verse,
                'objectif'      => $c->objectif_effectif,
                'progression'   => $c->progression,
            ]);

        return response()->json([
            'kpis' => [
                'encaisse_ce_mois'      => $encaisseCeMois,
                'cagnottes_actives'     => $cagnottesActives,
                'documents_a_valider'   => $documentsAValider,
                'nouveaux_utilisateurs' => $nouveauxUtilisateurs,
            ],
            'recouvrement' => [
                'taux'     => $tauxRecouvrement,
                'semaines' => $semaines->toArray(),
            ],
            'documents'           => $documents,
            'derniers_versements' => $derniersVersements,
            'a_surveiller'        => $aSurveiller,
        ]);
    }
}
