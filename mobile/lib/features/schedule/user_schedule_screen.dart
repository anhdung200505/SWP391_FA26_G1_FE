import 'package:flutter/material.dart';

class UserScheduleScreen extends StatelessWidget {
  const UserScheduleScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Lịch đặt sân của tôi')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: const [
          Card(
            child: ListTile(
              leading: Icon(Icons.event_available, color: Colors.green),
              title: Text('Sân Bóng đá số 1'),
              subtitle: Text('Thời gian: 18:00 - 19:30 | Ngày: Hôm nay'),
              trailing: Chip(label: Text('Đã xác nhận'), backgroundColor: Colors.greenAccent),
            ),
          ),
        ],
      ),
    );
  }
}