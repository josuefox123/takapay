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
    public function index(): AnonymousResourceCollection
    {
        return TransactionResource::collection(
            Transaction::with(['cagnotte', 'commande', 'echeance'])
                ->latest()
                ->paginate(15)
        );
    }

    public function store(StoreTransactionRequest $request): JsonResponse
    {
        $transaction = DB::transaction(function () use ($request) {
            $transaction = Transaction::create($request->validated());
            $this->applyTransactionEffects($transaction);

            return $transaction;
        });

        return (new TransactionResource(
            $transaction->load(['cagnotte', 'commande', 'echeance'])
        ))->response()->setStatusCode(201);
    }

    public function show(Transaction $transaction): TransactionResource
    {
        return new TransactionResource(
            $transaction->load(['cagnotte', 'commande', 'echeance'])
        );
    }

    public function update(
        UpdateTransactionRequest $request,
        Transaction $transaction
    ): TransactionResource {
        DB::transaction(function () use ($request, $transaction) {
            $wasSuccessful = $transaction->isSuccessful();
            if ($wasSuccessful) {
                $this->reverseTransactionEffects($transaction);
            }

            $transaction->update($request->validated());

            if ($transaction->isSuccessful()) {
                $this->applyTransactionEffects($transaction);
            }
        });

        return new TransactionResource(
            $transaction->fresh(['cagnotte', 'commande', 'echeance'])
        );
    }

    public function destroy(Transaction $transaction): JsonResponse
    {
        DB::transaction(function () use ($transaction) {
            if ($transaction->isSuccessful()) {
                $this->reverseTransactionEffects($transaction);
            }

            $transaction->delete();
        });

        return response()->json([
            'message' => 'Transaction supprimée avec succès.',
        ]);
    }

    private function applyTransactionEffects(Transaction $transaction): void
    {
        if (! $transaction->isSuccessful()) {
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

    private function reverseTransactionEffects(Transaction $transaction): void
    {
        if ($transaction->cagnotte_id !== null) {
            Cagnotte::whereKey($transaction->cagnotte_id)
                ->decrement('montant_verse', (float) $transaction->montant);
        }

        if ($transaction->echeance_id !== null) {
            Echeance::whereKey($transaction->echeance_id)
                ->update(['statut' => 'en_attente']);
        }
    }
}
