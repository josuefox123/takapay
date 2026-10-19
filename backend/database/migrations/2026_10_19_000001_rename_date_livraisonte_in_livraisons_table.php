<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Corrige la faute de frappe "date_livraisonte" propagée depuis la migration
     * d'origine (colonne, modèle et validation n'étaient pas alignés : la date
     * n'était jamais enregistrée).
     */
    public function up(): void
    {
        Schema::table('livraisons', function (Blueprint $table) {
            $table->renameColumn('date_livraisonte', 'date_livraison');
        });
    }

    public function down(): void
    {
        Schema::table('livraisons', function (Blueprint $table) {
            $table->renameColumn('date_livraison', 'date_livraisonte');
        });
    }
};
