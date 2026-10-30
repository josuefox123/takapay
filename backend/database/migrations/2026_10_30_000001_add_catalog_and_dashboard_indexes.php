<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->index(['statut', 'date'], 'transactions_statut_date_index');
        });

        Schema::table('echeances', function (Blueprint $table) {
            $table->index('date_prevue', 'echeances_date_prevue_index');
        });

        Schema::table('documents', function (Blueprint $table) {
            $table->index(['statut', 'created_at'], 'documents_statut_created_at_index');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->index('created_at', 'users_created_at_index');
        });

        Schema::table('cagnottes', function (Blueprint $table) {
            $table->index('statut', 'cagnottes_statut_index');
            $table->index(['produit_id', 'statut'], 'cagnottes_produit_statut_index');
        });

        Schema::table('produits', function (Blueprint $table) {
            $table->index('created_at', 'produits_created_at_index');
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->index('nom', 'categories_nom_index');
        });

        Schema::table('carousels', function (Blueprint $table) {
            $table->index(['is_actif', 'ordre', 'id'], 'carousels_actif_ordre_id_index');
        });
    }

    public function down(): void
    {
        Schema::table('carousels', function (Blueprint $table) {
            $table->dropIndex('carousels_actif_ordre_id_index');
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->dropIndex('categories_nom_index');
        });

        Schema::table('produits', function (Blueprint $table) {
            $table->dropIndex('produits_created_at_index');
        });

        Schema::table('cagnottes', function (Blueprint $table) {
            $table->dropIndex('cagnottes_produit_statut_index');
            $table->dropIndex('cagnottes_statut_index');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('users_created_at_index');
        });

        Schema::table('documents', function (Blueprint $table) {
            $table->dropIndex('documents_statut_created_at_index');
        });

        Schema::table('echeances', function (Blueprint $table) {
            $table->dropIndex('echeances_date_prevue_index');
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->dropIndex('transactions_statut_date_index');
        });
    }
};
