import 'package:flutter/material.dart';
import '../../app/network/api_client.dart';

class CourtBookingScreen extends StatefulWidget {
  const CourtBookingScreen({super.key});

  @override
  State<CourtBookingScreen> createState() => _CourtBookingScreenState();
}

class _CourtBookingScreenState extends State<CourtBookingScreen> {
  List<dynamic> _courts = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchCourts();
  }

  Future<void> _fetchCourts() async {
    try {
      final response = await ApiClient.dio.get('/courts');
      setState(() {
        _courts = response.data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Danh sách sân thể thao')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _courts.length,
              itemBuilder: (context, index) {
                final court = _courts[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: 16),
                  child: ListTile(
                    leading: const Icon(Icons.stadium, color: Colors.blue, size: 40),
                    title: Text(court['name'] ?? 'Sân thể thao'),
                    subtitle: Text('Loại: ${court['type']} - Giá: ${court['pricePerHour']}đ/h'),
                    trailing: ElevatedButton(
                      onPressed: () {
                        // Mở dialog/màn hình chọn khung giờ và đặt
                      },
                      child: const Text('Đặt ngay'),
                    ),
                  ),
                );
              },
            ),
    );
  }
}