<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cagnottes', function (Blueprint $table) {
            $table->foreignId('utilisateur_id')->nullable()->after('produit_id')->constrained('users')->nullOnDelete();
            $table->text('adresse_livraison')->nullable()->after('statut');
            $table->string('telephone_livraison')->nullable()->after('adresse_livraison');
            $table->text('note_livraison')->nullable()->after('telephone_livraison');
            $table->string('coordonnees_gps')->nullable()->after('note_livraison');
        });
    }

    public function down(): void
    {
        Schema::table('cagnottes', function (Blueprint $table) {
            $table->dropForeign(['utilisateur_id']);
            $table->dropColumn([
                'utilisateur_id',
                'adresse_livraison',
                'telephone_livraison',
                'note_livraison',
                'coordonnees_gps',
            ]);
        });
    }
};
