<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDocumentRequest;
use App\Http\Requests\UpdateDocumentRequest;
use App\Http\Resources\DocumentResource;
use App\Models\Document;
use Illuminate\Http\Request;

class DocumentController extends Controller
{
    /**
     * Liste des documents KYC : les siens, ou tous pour un administrateur.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $query = $user->isAdmin()
            ? Document::query()
            : Document::where('utilisateur_id', $user->id);

        return DocumentResource::collection($query->with(['utilisateur', 'verificateur'])->latest()->get());
    }

    /**
     * Déposer un document.
     */
    public function store(StoreDocumentRequest $request)
    {
        $data = $request->validated();

        // Le déposant est toujours dérivé du jeton ; le statut reste "en_attente"
        // tant que l'administration n'a pas vérifié (défaut en base).
        $data['utilisateur_id'] ??= $request->user()->id;

        $document = Document::create($data);

        return (new DocumentResource($document))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Afficher un document.
     */
    public function show(Request $request, Document $document)
    {
        $this->authorizeOwnerOrAdmin($request, $document);

        return new DocumentResource($document);
    }

    /**
     * Modifier un document.
     */
    public function update(UpdateDocumentRequest $request, Document $document)
    {
        $document->update($request->validated());

        return new DocumentResource($document);
    }

    /**
     * Supprimer un document.
     */
    public function destroy(Request $request, Document $document)
    {
        $this->authorizeOwnerOrAdmin($request, $document);

        $document->delete();

        return response()->json(['message' => 'Document supprimé avec succes']);
    }
}
