using AnhDuySport.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AnhDuySport.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<UserAccount> UserAccounts => Set<UserAccount>();
    public DbSet<PendingRegistration> PendingRegistrations => Set<PendingRegistration>();
    public DbSet<PasswordReset> PasswordResets => Set<PasswordReset>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<MembershipPackage> MembershipPackages => Set<MembershipPackage>();
    public DbSet<ActivityLog> ActivityLogs => Set<ActivityLog>();
    public DbSet<AccountNotification> Notifications => Set<AccountNotification>();
    public DbSet<Center> Centers => Set<Center>();
    public DbSet<Room> Rooms => Set<Room>();
    public DbSet<SportRoom> SportRooms => Set<SportRoom>();
    public DbSet<CoachSport> CoachSports => Set<CoachSport>();
    public DbSet<Sport> Sports => Set<Sport>();
    public DbSet<Course> Courses => Set<Course>();
    public DbSet<TrainingClass> Classes => Set<TrainingClass>();
    public DbSet<TimeSlot> TimeSlots => Set<TimeSlot>();
    public DbSet<ClassSchedule> ClassSchedules => Set<ClassSchedule>();
    public DbSet<ClassSession> ClassSessions => Set<ClassSession>();
    public DbSet<Membership> Memberships => Set<Membership>();
    public DbSet<ClassEnrollment> ClassEnrollments => Set<ClassEnrollment>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<PaymentHistory> PaymentHistories => Set<PaymentHistory>();
    public DbSet<ClassRegistrationLog> ClassRegistrationLogs => Set<ClassRegistrationLog>();
    public DbSet<SupportRequest> SupportRequests => Set<SupportRequest>();
    public DbSet<TrainingPlan> TrainingPlans => Set<TrainingPlan>();
    public DbSet<MemberBodyMetric> BodyMetrics => Set<MemberBodyMetric>();
    public DbSet<AiWorkoutRecommendation> WorkoutRecommendations => Set<AiWorkoutRecommendation>();
    public DbSet<AiWorkoutSession> WorkoutSessions => Set<AiWorkoutSession>();
    public DbSet<PersonalExercise> PersonalExercises => Set<PersonalExercise>();
    public DbSet<ClassAssignment> ClassAssignments => Set<ClassAssignment>();
    public DbSet<ClassAttendance> ClassAttendances => Set<ClassAttendance>();
    public DbSet<CoachEvaluation> CoachEvaluations => Set<CoachEvaluation>();
    public DbSet<CoachTrainingHistory> CoachTrainingHistories => Set<CoachTrainingHistory>();

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

        modelBuilder.Entity<MembershipPackage>()
            .Property(package => package.UpgradeDiscountPercent)
            .HasPrecision(5, 2);

        modelBuilder.Entity<Payment>()
            .Property(payment => payment.UpgradeAmount)
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
            entity.HasMany(item => item.Schedules)
                .WithOne()
                .HasForeignKey(schedule => schedule.ClassId);
            entity.HasMany(item => item.Sessions)
                .WithOne(session => session.Class)
                .HasForeignKey(session => session.ClassId);
            entity.HasMany(item => item.Enrollments)
                .WithOne()
                .HasForeignKey(enrollment => enrollment.ClassId);
        });

        modelBuilder.Entity<ClassSchedule>()
            .HasOne(item => item.TimeSlot)
            .WithMany()
            .HasForeignKey(item => item.TimeSlotId);

        modelBuilder.Entity<ClassSession>(entity =>
        {
            entity.ToTable("session", table => table.HasTrigger("TR_session_rules"));
            entity.HasOne(item => item.Coach)
                .WithMany()
                .HasForeignKey(item => item.CoachUserId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(item => item.Room)
                .WithMany()
                .HasForeignKey(item => item.RoomId)
                .OnDelete(DeleteBehavior.NoAction);
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

        modelBuilder.Entity<ClassRegistrationLog>()
            .HasOne(item => item.Payment)
            .WithMany()
            .HasForeignKey(item => item.PaymentId)
            .OnDelete(DeleteBehavior.NoAction);

        modelBuilder.Entity<SupportRequest>(entity =>
        {
            entity.HasOne(item => item.Member)
                .WithMany()
                .HasForeignKey(item => item.MemberUserId)
                .IsRequired(false)
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

        modelBuilder.Entity<MemberBodyMetric>(entity =>
        {
            entity.Property(item => item.HeightCm).HasPrecision(5, 1);
            entity.Property(item => item.WeightKg).HasPrecision(5, 1);
            entity.Property(item => item.Bmi).HasPrecision(4, 1);
        });

        modelBuilder.Entity<AiWorkoutRecommendation>(entity =>
        {
            entity.HasOne(item => item.BodyMetric)
                .WithMany()
                .HasForeignKey(item => item.BodyMetricId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(item => item.TrainingPlan)
                .WithMany()
                .HasForeignKey(item => item.TrainingPlanId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasMany(item => item.Sessions)
                .WithOne()
                .HasForeignKey(session => session.RecommendationId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PersonalExercise>()
            .HasOne<AiWorkoutRecommendation>()
            .WithMany()
            .HasForeignKey(item => item.RecommendationId)
            .OnDelete(DeleteBehavior.NoAction);

        modelBuilder.Entity<CoachEvaluation>()
            .Property(item => item.Score)
            .HasPrecision(4, 1);
    }
}
