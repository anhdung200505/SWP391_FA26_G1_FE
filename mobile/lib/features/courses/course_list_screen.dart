import 'package:flutter/material.dart';

class CourseListScreen extends StatelessWidget {
  const CourseListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Khóa học thể thao')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: const [
          Card(
            child: ListTile(
              leading: Icon(Icons.fitness_center, color: Colors.orange),
              title: Text('Khóa học Cầu lông cơ bản'),
              subtitle: Text('HLV: Nguyễn Văn A - Lịch: T3, T5, T7'),
            ),
          ),
        ],
      ),
    );
  }
}