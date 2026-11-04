<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('cagnottes') && ! Schema::hasColumn('cagnottes', 'motif_annulation')) {
            Schema::table('cagnottes', function (Blueprint $table) {
                $table->text('motif_annulation')->nullable()->after('telephone_remboursement');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('cagnottes') && Schema::hasColumn('cagnottes', 'motif_annulation')) {
            Schema::table('cagnottes', function (Blueprint $table) {
                $table->dropColumn('motif_annulation');
            });
        }
    }
};

