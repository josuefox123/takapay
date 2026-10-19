<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTransactionRequest;
use App\Http\Requests\UpdateTransactionRequest;
use App\Http\Resources\TransactionResource;
use App\Models\Cagnotte;
use App\Models\Echeance;
use App\Models\Transaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class TransactionController extends Controller
{
    /**
     * Liste paginée des transactions.
     */
    public function index(): AnonymousResourceCollection
    {
        return TransactionResource::collection(Transaction::latest()->paginate(15));
    }

    /**
     * Créer une transaction.
     * Une transaction réussie crédite immédiatement la cagnotte liée
     * et solde l'échéance éventuelle — le tout dans une transaction SQL.
     */
    public function store(StoreTransactionRequest $request): JsonResponse
    {
        $transaction = DB::transaction(function () use ($request) {
            $transaction = Transaction::create($request->validated());

            $this->applyTransactionEffects($transaction);

            return $transaction;
        });

        return (new TransactionResource($transaction))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Afficher une transaction.
     */
    public function show(Transaction $transaction): TransactionResource
    {
        return new TransactionResource($transaction);
    }

    /**
     * Modifier une transaction.
     */
    public function update(
        UpdateTransactionRequest $request,
        Transaction $transaction
    ): TransactionResource {
        $transaction->update($request->validated());

        return new TransactionResource($transaction);
    }

    /**
     * Supprimer une transaction.
     */
    public function destroy(Transaction $transaction): JsonResponse
    {
        DB::transaction(function () use ($transaction) {
            if ($this->isSuccessful($transaction)) {
                $this->reverseTransactionEffects($transaction);
            }

            $transaction->delete();
        });

        return response()->json([
            'message' => 'Transaction supprimée avec succès.',
        ]);
    }

    /**
     * Applique les effets financiers d'une transaction créditée avec succès.
     */
    private function applyTransactionEffects(Transaction $transaction): void
    {
        if (! $this->isSuccessful($transaction)) {
            return;
        }

        if ($transaction->cagnotte_id !== null) {
            Cagnotte::whereKey($transaction->cagnotte_id)
                ->increment('montant_verse', (float) $transaction->montant);
        }

        if ($transaction->echeance_id !== null) {
            Echeance::whereKey($transaction->echeance_id)
                ->update(['statut' => 'payee']);
        }
    }

    /**
     * Annule les effets financiers (utilisé lors de la suppression).
     */
    private function reverseTransactionEffects(Transaction $transaction): void
    {
        if ($transaction->cagnotte_id !== null) {
            Cagnotte::whereKey($transaction->cagnotte_id)
                ->decrement('montant_verse', (float) $transaction->montant);
        }
    }

    private function isSuccessful(Transaction $transaction): bool
    {
        return in_array($transaction->statut, ['succes', 'reussi'], true);
    }
}
