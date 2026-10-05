<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('utilisateur_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action');
            $table->string('table_cible');
            $table->unsignedBigInteger('record_id')->nullable();
            $table->text('ancienne_valeur')->nullable();
            $table->text('nouvelle_valeur')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audits');
    }
};
