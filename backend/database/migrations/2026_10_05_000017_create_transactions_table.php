<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cagnotte_id')->nullable()->constrained('cagnottes')->nullOnDelete();
            $table->foreignId('echeance_id')->nullable()->constrained('echeances')->nullOnDelete();
            $table->string('reference_externe')->nullable();
            $table->dateTime('date');
            $table->string('statut')->default('succes');
            $table->decimal('montant', 12, 2);
            $table->string('prestataire')->nullable();
            $table->string('type')->nullable();
            $table->string('moyen_paiement')->nullable();
            $table->string('devise', 10)->default('XOF');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
