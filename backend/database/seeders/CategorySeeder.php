<?php

namespace Database\Seeders;

use App\Models\Categorie;
use App\Models\ImageProduit;
use App\Models\ParametreProduit;
use App\Models\Produit;
use App\Models\SousCategorie;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        // 1. Supprimer tous les produits existants
        // (SET FOREIGN_KEY_CHECKS est spécifique à MySQL)
        if (DB::getDriverName() === 'mysql') {
            DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        }
        ImageProduit::truncate();
        ParametreProduit::truncate();
        Produit::truncate();
        SousCategorie::truncate();
        Categorie::truncate();
        if (DB::getDriverName() === 'mysql') {
            DB::statement('SET FOREIGN_KEY_CHECKS=1;');
        }

        // 2. Les 17 catégories officielles et leurs sous-catégories
        $categories = [
            [
                'nom' => 'Informatique & Multimédia',
                'subs' => ['Ordinateurs', 'Tablettes', 'Accessoires informatique', 'Stockage', 'Réseau', 'Imprimantes & consommables'],
            ],
            [
                'nom' => 'Téléphonie',
                'subs' => ['Smartphones', 'Accessoires', 'Objets connectés'],
            ],
            [
                'nom' => 'Électroménager',
                'subs' => ['Froid', 'Cuisine', 'Entretien', 'Climatisation & ventilation'],
            ],
            [
                'nom' => 'Audio & Vidéo',
                'subs' => ['Téléviseurs', 'Son', 'Photo & vidéo'],
            ],
            [
                'nom' => 'Alimentation & Boissons',
                'subs' => ['Céréales & féculents', 'Huiles & condiments', 'Produits de base', 'Boissons', 'Produits frais & surgelés'],
            ],
            [
                'nom' => 'Jouets & Jeux',
                'subs' => ['Jouets enfants', 'Jeux éducatifs', 'Jeux vidéo', 'Jeux d’extérieur'],
            ],
            [
                'nom' => 'Motos & Scooters',
                'subs' => ['Motos', 'Pièces détachées', 'Équipements'],
            ],
            [
                'nom' => 'Vélos',
                'subs' => ['Vélos', 'Accessoires', 'Pièces'],
            ],
            [
                'nom' => 'Automobile',
                'subs' => ['Pièces auto', 'Accessoires', 'Entretien'],
            ],
            [
                'nom' => 'Mode & Accessoires',
                'subs' => ['Femme', 'Homme', 'Enfant', 'Accessoires'],
            ],
            [
                'nom' => 'Beauté & Santé',
                'subs' => ['Soins', 'Maquillage', 'Cheveux', 'Santé'],
            ],
            [
                'nom' => 'Maison & Décoration',
                'subs' => ['Meubles', 'Literie', 'Cuisine & vaisselle', 'Éclairage'],
            ],
            [
                'nom' => 'Bricolage & Outillage',
                'subs' => ['Outils', 'Matériaux', 'Sécurité'],
            ],
            [
                'nom' => 'Bébé & Maternité',
                'subs' => ['Alimentation', 'Hygiène', 'Équipement'],
            ],
            [
                'nom' => 'Sport & Loisirs',
                'subs' => ['Fitness', 'Sports d’équipe', 'Camping'],
            ],
            [
                'nom' => 'Scolaire & Bureau',
                'subs' => ['Fournitures', 'Mobilier de bureau'],
            ],
            [
                'nom' => 'Agriculture & Animaux',
                'subs' => ['Agriculture', 'Animaux'],
            ],
        ];

        foreach ($categories as $catData) {
            $cat = Categorie::create(['nom' => $catData['nom']]);
            foreach ($catData['subs'] as $subNom) {
                SousCategorie::create([
                    'nom' => $subNom,
                    'categorie_id' => $cat->id,
                ]);
            }
        }
    }
}
