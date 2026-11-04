<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('produits', 'admin_id')) {
            Schema::table('produits', function (Blueprint $table) {
                $table->foreignId('admin_id')
                    ->nullable()
                    ->after('id')
                    ->constrained('users')
                    ->nullOnDelete();
            });
        }

        // Rattacher les produits existants au Super Admin pour préserver tout l'historique
        $superAdminId = DB::table('users')->where('role', 'super_admin')->value('id');
        if ($superAdminId) {
            DB::table('produits')->whereNull('admin_id')->update(['admin_id' => $superAdminId]);
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('produits', 'admin_id')) {
            Schema::table('produits', function (Blueprint $table) {
                $table->dropConstrainedForeignId('admin_id');
            });
        }
    }
};

