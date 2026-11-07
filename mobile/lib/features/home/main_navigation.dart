import 'package:flutter/material.dart';
import '../booking/court_booking_screen.dart';
import '../courses/course_list_screen.dart';
import '../schedule/user_schedule_screen.dart';

class MainNavigation extends StatefulWidget {
  const MainNavigation({super.key});

  @override
  State<MainNavigation> createState() => _MainNavigationState();
}

class _MainNavigationState extends State<MainNavigation> {
  int _currentIndex = 0;

  final List<Widget> _screens = [
    const CourtBookingScreen(),
    const CourseListScreen(),
    const UserScheduleScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _screens[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.sports_tennis),
            label: 'Đặt sân',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.school),
            label: 'Khóa học',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.calendar_today),
            label: 'Lịch của tôi',
          ),
        ],
      ),
    );
  }
}