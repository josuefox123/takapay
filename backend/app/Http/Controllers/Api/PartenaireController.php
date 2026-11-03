<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PartenaireResource;
use App\Models\Partenaire;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;

class PartenaireController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return PartenaireResource::collection(
            Partenaire::where('actif', true)
                ->orderBy('ordre')
                ->orderBy('id')
                ->get()
        );
    }

    public function adminIndex(): AnonymousResourceCollection
    {
        return PartenaireResource::collection(
            Partenaire::orderBy('ordre')
                ->orderBy('id')
                ->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nom' => ['required', 'string', 'max:255'],
            'logo' => ['required', 'image', 'mimes:jpeg,png,jpg,webp,gif', 'max:5120'],
            'lien' => ['nullable', 'url:http,https', 'max:255'],
            'ordre' => ['nullable', 'integer'],
            'actif' => ['sometimes', 'boolean'],
        ]);

        $validated['logo'] = $request->file('logo')->store('partenaires', 'public');

        $partenaire = Partenaire::create($validated);

        return (new PartenaireResource($partenaire))
            ->response()
            ->setStatusCode(201);
    }

    public function update(Request $request, Partenaire $partenaire): JsonResponse
    {
        $validated = $request->validate([
            'nom' => ['sometimes', 'required', 'string', 'max:255'],
            'logo' => ['sometimes', 'image', 'mimes:jpeg,png,jpg,webp,gif', 'max:5120'],
            'lien' => ['nullable', 'url:http,https', 'max:255'],
            'ordre' => ['sometimes', 'integer'],
            'actif' => ['sometimes', 'boolean'],
        ]);

        $oldLogo = null;
        if ($request->hasFile('logo')) {
            $validated['logo'] = $request->file('logo')->store('partenaires', 'public');
            $oldLogo = $partenaire->logo;
        }

        $partenaire->update($validated);

        if ($oldLogo && Storage::disk('public')->exists($oldLogo)) {
            Storage::disk('public')->delete($oldLogo);
        }

        return response()->json([
            'message' => 'Partenaire mis à jour avec succès.',
            'data' => new PartenaireResource($partenaire->fresh()),
        ]);
    }

    public function destroy(Partenaire $partenaire): JsonResponse
    {
        $logo = $partenaire->logo;
        $partenaire->delete();

        if ($logo && Storage::disk('public')->exists($logo)) {
            Storage::disk('public')->delete($logo);
        }

        return response()->json([
            'message' => 'Partenaire supprimé avec succès.',
        ]);
    }
}
