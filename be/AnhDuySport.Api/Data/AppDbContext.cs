using AnhDuySport.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<UserAccount> UserAccounts => Set<UserAccount>();
    public DbSet<PendingRegistration> PendingRegistrations => Set<PendingRegistration>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<MembershipPackage> MembershipPackages => Set<MembershipPackage>();
    public DbSet<ActivityLog> ActivityLogs => Set<ActivityLog>();
    public DbSet<AccountNotification> Notifications => Set<AccountNotification>();
    public DbSet<Center> Centers => Set<Center>();
    public DbSet<Room> Rooms => Set<Room>();
    public DbSet<Sport> Sports => Set<Sport>();
    public DbSet<Course> Courses => Set<Course>();
    public DbSet<TrainingClass> Classes => Set<TrainingClass>();
    public DbSet<ClassSlot> ClassSlots => Set<ClassSlot>();
    public DbSet<SlotRegistration> SlotRegistrations => Set<SlotRegistration>();
    public DbSet<Membership> Memberships => Set<Membership>();
    public DbSet<ClassEnrollment> ClassEnrollments => Set<ClassEnrollment>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<SupportRequest> SupportRequests => Set<SupportRequest>();

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

        modelBuilder.Entity<Room>()
            .HasOne(room => room.Center)
            .WithMany()
            .HasForeignKey(room => room.CenterId);

        modelBuilder.Entity<Course>(entity =>
        {
            entity.HasOne(course => course.Sport)
                .WithMany()
                .HasForeignKey(course => course.SportId);
            entity.Property(course => course.Price).HasPrecision(18, 2);
        });

        modelBuilder.Entity<TrainingClass>(entity =>
        {
            entity.HasOne(item => item.Course)
                .WithMany()
                .HasForeignKey(item => item.CourseId);
            entity.HasOne(item => item.Coach)
                .WithMany()
                .HasForeignKey(item => item.CoachUserId);
            entity.HasOne(item => item.Room)
                .WithMany()
                .HasForeignKey(item => item.RoomId);
            entity.HasMany(item => item.Slots)
                .WithOne(slot => slot.Class)
                .HasForeignKey(slot => slot.ClassId);
            entity.HasMany(item => item.Enrollments)
                .WithOne()
                .HasForeignKey(enrollment => enrollment.ClassId);
        });

        modelBuilder.Entity<SlotRegistration>(entity =>
        {
            entity.ToTable("slot_registration", table => table.HasTrigger("TR_slot_registration_limit"));
            entity.HasOne(item => item.Slot)
                .WithMany(slot => slot.Registrations)
                .HasForeignKey(item => item.SlotId);
            entity.HasOne(item => item.Member)
                .WithMany()
                .HasForeignKey(item => item.UserId);
        });

        modelBuilder.Entity<Invoice>()
            .Property(invoice => invoice.TotalAmount)
            .HasPrecision(18, 2);

        modelBuilder.Entity<Payment>(entity =>
        {
            entity.HasOne(payment => payment.Invoice)
                .WithMany()
                .HasForeignKey(payment => payment.InvoiceId);
            entity.HasOne(payment => payment.Class)
                .WithMany()
                .HasForeignKey(payment => payment.ClassId);
            entity.Property(payment => payment.Amount).HasPrecision(18, 2);
        });

        modelBuilder.Entity<SupportRequest>(entity =>
        {
            entity.HasOne(item => item.Member)
                .WithMany()
                .HasForeignKey(item => item.MemberUserId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(item => item.Assignee)
                .WithMany()
                .HasForeignKey(item => item.AssignedToUserId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<Membership>(entity =>
        {
            entity.HasOne(item => item.Package)
                .WithMany()
                .HasForeignKey(item => item.MembershipPackageId);
            entity.HasOne(item => item.Payment)
                .WithMany()
                .HasForeignKey(item => item.PaymentId);
        });
    }
}
