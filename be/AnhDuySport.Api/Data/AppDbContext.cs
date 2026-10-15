using AnhDuySport.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<UserAccount> UserAccounts => Set<UserAccount>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<MembershipPackage> MembershipPackages => Set<MembershipPackage>();
    public DbSet<ActivityLog> ActivityLogs => Set<ActivityLog>();
    public DbSet<AccountNotification> Notifications => Set<AccountNotification>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<UserAccount>(entity =>
        {
            entity.HasOne(user => user.Role)
                .WithMany()
                .HasForeignKey(user => user.RoleId);
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasMany(role => role.Permissions)
                .WithOne()
                .HasForeignKey(permission => permission.RoleId);
        });

        modelBuilder.Entity<MembershipPackage>()
            .Property(package => package.Fee)
            .HasPrecision(18, 2);
    }
}
