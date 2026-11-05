namespace AnhDuySport.Api.Data;

public static partial class OfficialCourseCatalog
{
    private static Entry Soccer() => new(
        "FIFA Grassroots, xếp thành khóa từ thứ tự kỹ năng đã xuất bản",
        "https://www.fifatrainingcentre.com/en/practice/grassroots.php",
        "FIFA không phát một thời khóa biểu cố định. Khóa này xếp các kỹ năng đúng thứ tự sách grassroots: chơi sân nhỏ, dẫn bóng, chuyền lòng bàn chân, khống chế, rê bóng 1 đấu 1, quyết định 2 đấu 1, sút, rồi trận có thủ môn. Mỗi buổi theo khung chơi, tập, rồi chơi lại.",
        [
            Unit("Buổi 1. Chơi sân nhỏ", """
                Chơi là cách học: sân nhỏ, nhiều lần chạm bóng, có hợp tác và có đối kháng.
                1. Khởi động kiểu diều hâu: mỗi người một bóng đứng trên một vạch, một người không bóng đối diện. Khi có hiệu lệnh, dẫn bóng sang vạch kia. Người diều hâu chạm vai để bắt. Luân phiên làm diều hâu.
                2. Trận 2 đấu 2 hoặc 3 đấu 3, ghi điểm khi dẫn bóng qua vạch cầu môn. Mỗi lượt 1 đến 2 phút rồi đổi đối thủ.
                3. Trận 4 đấu 4 có thủ môn nếu đủ người. Chơi tự do, khuyến khích dẫn bóng, người dạy ít can thiệp.
                4. Kết: mỗi người sút bóng dừng càng gần một vạch cho sẵn càng tốt. Ai gần nhất được một điểm.
                """),
            Unit("Buổi 2. Dẫn bóng hai chân", """
                Dẫn bóng bằng cả chân trái và chân phải, khống chế gần chân, nhiều nhịp chạm.
                1. Chơi ngắn không đối thủ: dẫn bóng trong ô, đầu ngẩng khi đã giữ được bóng.
                2. Dẫn không vật cản bằng mu trong chân trái, rồi chân phải. Bóng luôn trong tầm kiểm soát.
                3. Dẫn có vật cản, tức rê bóng: qua nón bằng một chân rồi đổi chân.
                4. Chơi lại trận nhỏ. Quan sát người học còn dẫn bằng cả hai chân khi bị tranh bóng hay không.
                """, "Ôn cách dẫn bóng đã xuất hiện trong trận buổi 1."),
            Unit("Buổi 3. Chuyền lòng bàn chân", """
                Chuyền sát đất bằng mu trong chân trái và chân phải. Chuyền là lõi của đội: giữ bóng, triển khai, đổi hướng.
                1. Chơi đếm số đường chuyền trong một phút, sân vừa sức.
                2. Nhóm ít nhất ba người. Người A dẫn bằng mu trong chân trái, vòng nón, chuyền mu trong chân trái cho người B rồi chạy thế chỗ. Người B làm tương tự bằng chân phải cho người C.
                3. Trận nhỏ bắt buộc chuyền trước khi được dẫn quá hai nhịp, rồi bỏ luật này ở vài phút cuối để xem đường chuyền còn được dùng không.
                """),
            Unit("Buổi 4. Khống chế bóng", """
                Khống chế là làm chủ bóng để hành động sau đó thành công. Hai việc cần tập: khống chế có hướng, và gom bóng khi đang di chuyển để đưa tốc độ vào tình huống.
                1. Mỗi người một bóng, phối hợp chạm bằng mu trong, mu ngoài, lòng bàn chân, bóng không rời xa.
                2. Bạn lăn bóng chậm. Người nhận đón bóng đi tiếp về một phía đã chỉ, không dừng chết.
                3. Keepy-uppy ngắn. Làm đều để hỗ trợ khéo léo, phối hợp và thăng bằng.
                4. Trận 2 đấu 2 có bốn người trung lập ngoài biên. Đếm số đường chuyền. Mất bóng thì đếm lại từ đầu.
                """, "Dùng lại dẫn bóng và chuyền của buổi 2 và buổi 3 khi đón bóng xong."),
            Unit("Buổi 5. Rê bóng 1 đấu 1", """
                Dẫn bóng ở chỗ trống khác với rê bóng khi có đối thủ. Rê bóng để qua một hoặc vài người, câu giờ chờ hỗ trợ, hoặc đánh lừa bằng động tác giả.
                1. 1 đấu 1 là dạng chơi nhỏ nhất. Một người bảo vệ bóng, một người tranh. Đổi vai.
                2. Hành lang hẹp: người cầm bóng qua đối thủ bằng một động tác, không được chuyền vì chưa có đồng đội.
                3. Trận nhỏ trong đó được khuyến khích đi bóng khi có khoảng trống, và bảo vệ bóng khi bị áp sát.
                """),
            Unit("Buổi 6. 2 đấu 1, giữ hay chuyền", """
                Vừa thêm một đồng đội thì tình huống đổi: có thể chuyền, và người cầm bóng phải tự quyết định giữ hay chuyền.
                1. 2 đấu 1 trong ô. Người thừa bóng chọn giữ để rê hoặc chuyền cho người không bị kèm.
                2. Sau đường chuyền, người chuyền phải chạy hỗ trợ, không đứng lại.
                3. Trận 3 đấu 3. Số người càng tăng thì tình huống càng phức tạp, nên dừng ở nhóm nhỏ.
                """, "Quyết định dùng kỹ năng rê bóng buổi 5 hoặc chuyền buổi 3."),
            Unit("Buổi 7. Sút cầu môn", """
                Sút là kết thúc một đợt tấn công. Cần chạm bóng đúng, chính xác, thăng bằng, và dám sút.
                1. Sút vào cầu môn trống sau khi dẫn chậm, chân thuận rồi chân không thuận.
                2. Hai nhóm. Người A dẫn qua hàng nón, vòng nón cuối và sút chân phải. Người B làm tương tự bằng chân trái. Đổi bên sau mỗi lượt. Thủ môn đổi sau vài loạt.
                3. Trận nhỏ có cầu môn. Được sút ngay khi có khoảng trống, không bắt buộc chuyền thêm.
                """),
            Unit("Buổi 8. Trận 4 đấu 4", """
                Dạng trận dùng sau khi đã có dẫn bóng, chuyền và sút.
                1. Khởi động dẫn bóng và chuyền lòng bàn chân, mỗi thứ một vài phút.
                2. 4 đấu 4 có thủ môn, sân vừa số người. Có người dự bị và thay thường xuyên vì trận sân nhỏ rất mạnh, không nên kéo dài một lượt.
                3. Người dạy ít ngắt. Chỉ nhắc khi cả đội không còn sút hoặc không còn chuyền.
                4. Nói ngắn cuối buổi: tình huống nào nên giữ bóng, tình huống nào nên chuyền, tình huống nào nên sút.
                """, "Ôn dẫn bóng, chuyền và sút trong cùng một trận."),
            Unit("Buổi 9. 5 đấu 5 và biên", """
                Mỗi đội thêm người biên trong trận 5 đấu 5. Khi biên nhận bóng thì được vào sân ở điểm đó. Người vừa chuyền ra biên trở thành biên kế tiếp. Nếu thủ môn chuyền cho biên thì biên trả lại cho đồng đội và vẫn đứng biên.
                1. Làm rõ luật biên trước khi giao bóng.
                2. Chơi theo luật đó. Mục tiêu là dùng người biên, không phải đi bóng một mình suốt trận.
                3. Vài phút cuối bỏ người biên và chơi 5 đấu 5 thường để xem đường chuyền ra cánh còn xuất hiện không.
                """),
            Unit("Buổi 10. Trận áp dụng", """
                Buổi cuối dùng toàn bộ kỹ năng đã xếp trong khóa. Ít luật phụ, người học tự xử lý.
                1. Khởi động có bóng, mỗi người nhiều nhịp chạm.
                2. Một trận sân nhỏ có thủ môn, đủ thời gian để có cả phòng thủ và tấn công. Ở sân nhỏ mỗi người đều phải tìm bóng, không có chỗ đứng trốn.
                3. Thay người thường xuyên để nhịp trận không rơi.
                4. Kết thúc bằng một vòng nói: tình huống giữ bóng, đường chuyền, và cú sút trong chính trận vừa chơi.
                """, "Dùng lại dẫn bóng, khống chế, chuyền, rê bóng và sút."),
        ]);

    private static Entry TableTennis() => new(
        "ITTF Four Classes cho người mới, nối với bài kiểm tra cơ bản Level 1",
        "https://www.ittfeducation.com/wp-content/uploads/2020/07/Four-Classes-Lesson-1-Beginners_s.pdf",
        "ITTF không phát một thời khóa biểu cả khóa. Khóa này đi đúng thứ tự Four Classes: cầm vợt, sẵn sàng, đập và nảy bóng, đẩy, thuận tay, trái tay, chuyển bên. Phần giao bóng, rally và luật lấy từ nội dung kiểm tra cơ bản Level 1.",
        [
            Unit("Buổi 1. Cầm vợt", """
                Học, áp dụng, rồi tự kiểm tra cách cầm.
                1. Cầm shakehand: ngón cái và ngón trỏ nằm dọc hai cạnh mặt vợt, cán nằm trong lòng bàn tay còn lại. Vợt tạo một đường với cẳng tay.
                2. Nếu người học đã cầm penhold và muốn giữ, ngón cái và ngón trỏ vòng cán, ba ngón kia trên mặt kia. Không bắt đổi kiểu đã quen nếu họ chọn rõ.
                3. Tránh cầm hai tay, và tránh dùng tay không chỉnh vợt trước mỗi cú.
                4. Tay trẻ có thể chưa khớp cán. Coi đây là giai đoạn tìm cách cầm, nhưng sửa thói sai ngay.
                5. Đứng thành hàng, từng người làm lại cách cầm để được kiểm tra.
                """),
            Unit("Buổi 2. Tư thế sẵn sàng", """
                1. Gối khuỵu, người hơi đổ về trước, vai thả.
                2. Vợt ở khoảng giữa thân, cao ngang mặt bàn.
                3. Sau mỗi cú, về lại tư thế này trước khi làm cú sau.
                4. Đứng tại chỗ, giáo viên hô để cả nhóm vào tư thế và giữ thăng bằng.
                5. Kiểm tra lại cách cầm của buổi 1 khi đã vào tư thế.
                """, "Kiểm tra cách cầm buổi 1 khi đứng sẵn sàng."),
            Unit("Buổi 3. Đập và nảy bóng trên vợt", """
                Lần đầu bóng gặp vợt, chưa cần bàn. Một bóng, một vợt.
                1. Đập bóng lên mặt vợt nhiều lần, cảm phản lực của bóng trên mặt vợt và trong lòng bàn tay.
                2. Nảy bóng xuống mặt vợt, vẫn giữ nhịp.
                3. Đổi độ cao: thấp và đều trước, cao hơn sau.
                4. Vừa đi bộ chậm vừa giữ bóng trên vợt.
                5. Đếm số cú liên tiếp. Mục tiêu là đều, không phải mạnh.
                """),
            Unit("Buổi 4. Cú đẩy", """
                Đẩy là đưa bóng từ chỗ này sang chỗ kia, không đánh mạnh. Khi bóng chạm vợt thì đi cùng bóng một đoạn. Có điểm kết thúc cú, vì cú sau nối ngay.
                1. Thả bóng lên bàn của mình, đẩy sang bàn đối diện, bạn bắt bóng chứ chưa đánh trả.
                2. Đẩy thuận tay: mặt vợt đi thẳng, bóng ít xoáy. Tay không được tụt xuống. Vung người phía trên để chuẩn bị, không lấy đà quá dài.
                3. Đẩy trái tay: giữ vợt cao, ngang bóng hoặc ngang ngực. Đánh đúng nhịp để bóng không nảy cao quá đầu.
                4. Mỗi người một loạt đẩy vào một vùng bàn đã chỉ.
                """, "Giữ tư thế sẵn sàng buổi 2 trước mỗi cú đẩy."),
            Unit("Buổi 5. Thuận tay", """
                1. Chân đặt khoảng 45 độ so với bàn.
                2. Vợt bắt đầu gần như thẳng đứng.
                3. Đường vợt đi thẳng vì cú thuận tay ở giai đoạn này tạo bóng ít xoáy.
                4. Kết thúc lên trước và lên trên.
                5. Tập một mình với bóng thả, rồi rally thuận tay. Đếm số cú liên tiếp. Mục tiêu là chuỗi dài hơn lần trước, bóng còn vào bàn.
                """),
            Unit("Buổi 6. Trái tay", """
                Trái tay là cú đơn giản hơn nên người mới hay dùng nhiều. Vẫn phải học đủ, không bỏ thuận tay.
                1. Hai bàn chân khá vuông với bàn.
                2. Vợt bắt đầu trước bụng, thẳng đứng.
                3. Giữ vợt cao hơn bóng.
                4. Kết thúc lên trước, lên trên, theo hướng đánh.
                5. Có thể đếm to để giữ nhịp, tránh bóng nảy cao quá đầu.
                6. Rally trái tay. Đếm số cú liên tiếp, ưu tiên đều và vào bàn.
                """),
            Unit("Buổi 7. Chuyển thuận và trái", """
                Chuyển thuận sang trái và ngược lại là kỹ năng cơ bản xuất hiện ở mọi giai đoạn sau. Tay và thân trên không được dừng giữa hai cú.
                1. Bước ngang ngắn để vợt tới đúng bên, rồi mới đánh.
                2. Chuỗi chậm: hai thuận, hai trái.
                3. Chuỗi một thuận, một trái.
                4. Bạn thả bóng sang bên bất kỳ. Người đánh phải chuyển đúng bên.
                5. Từ dễ đến khó, từ chậm đến nhanh. Chưa tăng lực.
                """, "Dùng cú thuận buổi 5 và cú trái buổi 6 trong cùng một rally."),
            Unit("Buổi 8. Giao bóng", """
                Phần này nằm trong nội dung kiểm tra cơ bản, sau các cú đánh.
                1. Nói luật giao trước khi đánh: tung bóng, tiếp xúc khi bóng đang rơi, bóng nảy bên mình rồi mới sang bàn kia.
                2. Giao xoáy lên thuận tay và trái tay: mặt vợt gần thẳng đứng, chạm phía sau và phía trên bóng, đưa vợt lên trước và lên trên.
                3. Giao xoáy xuống thuận tay và trái tay: chạm thấp hơn và vuốt xuống.
                4. Lúc đầu một người giao, người kia bắt bóng rồi giao trả, chưa rally.
                5. Mục tiêu là vào bàn và vào vùng đã chỉ, chưa phải giao thật mạnh.
                """),
            Unit("Buổi 9. Đỡ giao và rally", """
                1. Đọc bóng giao: nảy thấp và lao thì xử lý khác bóng nảy cao.
                2. Góc vợt khớp loại xoáy vừa học, ưu tiên đưa bóng vào bàn trước khi đánh mạnh.
                3. Rally chỉ thuận tay, đếm số cú vào bàn.
                4. Rally chỉ trái tay, cùng cách đếm.
                5. Rally có chuyển bên, mở đầu bằng một quả giao hợp lệ.
                """, "Ôn giao bóng buổi 8 và chuyển bên buổi 7."),
            Unit("Buổi 10. Luật và trận", """
                1. Không đánh volley: bóng phải nảy trước khi đánh trả.
                2. Rally kéo dài đến khi một người không trả được bóng vào bàn.
                3. Giao bóng đổi sau mỗi năm điểm, trừ khi hòa ở điểm cuối thì đổi từng điểm. Giao chạm lưới rồi vẫn vào bàn thì giao lại, không mất điểm.
                4. Chọn quyền giao hoặc chọn bên bằng cách giấu bóng dưới bàn.
                5. Chơi một trận ngắn. Khen rally được nhiều cú, không chỉ khen điểm thắng.
                """),
        ]);

    private static Entry Fencing() => new(
        "British Fencing Foil Achievement Awards, hạng 1 và hạng 2",
        "https://britishfencing.com/uploads/files/foil_1-6_poster.pdf",
        "FIE không công bố giáo trình buổi cho người mới. Khóa này đi theo thứ tự phải làm được trong chứng chỉ foil hạng 1, rồi hạng 2, của British Fencing. Vũ khí dùng là kiếm ba cạnh.",
        [
            Unit("Buổi 1. An toàn, cầm kiếm và chào", """
                1. Cách giữ kiếm để không chĩa vào người khi chưa được lệnh, và cách đeo, mang, đặt kiếm.
                2. Cầm kiếm: ngón cái và ngón trỏ điều khiển mũi, các ngón còn lại giữ cán.
                3. Chào: tư thế đứng thẳng, chào đối thủ và người điều khiển trước khi đọ kiếm.
                4. Vùng trúng của kiếm ba cạnh là thân, không tính tay và chân.
                5. Phép lịch sự: không đánh khi đối thủ chưa sẵn sàng, dừng khi có lệnh dừng.
                """),
            Unit("Buổi 2. Tư thế sẵn sàng và bước", """
                1. En garde: chân trước và chân sau tách, gối khuỵu, thân nghiêng, tay kiếm về phía trước.
                2. Tư thế sixte: mũi kiếm ở đường cao phía ngoài.
                3. Tư thế quarte: mũi kiếm ở đường cao phía trong.
                4. Bước tiến và bước lùi, thân không dựng thẳng và không chéo chân.
                5. Đi theo bước của bạn tập, giữ đường kiếm và khoảng cách.
                """, "Giữ cách cầm và chào của buổi 1 trước mỗi lần vào en garde."),
            Unit("Buổi 3. Đâm thẳng và lunge", """
                1. Đưa tay đâm trước, rồi chân trước mới phóng.
                2. Lunge: chân trước đẩy ra, chân sau duỗi, mũi kiếm tới mục tiêu rồi thu về.
                3. Đòn tấn công thẳng: từ en garde đâm thẳng vào vùng trúng khi đối thủ mở.
                4. Tập với người dạy hoặc bạn: giữ đúng cự ly lunge, khi đối thủ dừng thì tấn công thẳng.
                5. Chưa học đỡ. Buổi này chỉ ra đòn.
                """),
            Unit("Buổi 4. Đỡ đơn và trả đòn", """
                1. Đỡ đơn: đưa lưỡi kiếm chặn đường mũi đối thủ.
                2. Từ đỡ đó, riposte thẳng vào vùng trúng.
                3. Làm ở tư thế quarte và sixte.
                4. Đối thủ tấn công thẳng, người học đỡ rồi trả một nhịp, không thêm đòn giả.
                """, "Dùng lunge buổi 3 cho nhịp trả đòn khi cần thêm cự ly."),
            Unit("Buổi 5. Phản trả đòn đầu tiên", """
                1. Đối thủ đỡ riposte của mình.
                2. Đỡ lại nhịp đó và trả đòn thẳng một lần. Đây là counter-riposte đầu tiên.
                3. Làm chậm, từng nhịp có lệnh: tấn công, đỡ, trả, đỡ, trả.
                4. Nhắc vùng trúng và lệnh dừng.
                """, "Nối đỡ và trả đòn của buổi 4."),
            Unit("Buổi 6. Cự ly bước và bước-lunge", """
                Giữ đúng cự ly khi đối thủ bước.
                1. Cự ly trả đòn: đứng đủ gần để riposte chạm mà không cần lunge dài.
                2. Cự ly lunge: một lunge là chạm.
                3. Cự ly bước rồi lunge: một bước tiến cộng một lunge mới chạm.
                4. Đi theo bước tiến và lùi của bạn, không được mất các cự ly này.
                """, "Ôn bước buổi 2 và lunge buổi 3 ở ba cự ly."),
            Unit("Buổi 7. Septime, octave và khóa lưỡi", """
                1. Septime: tư thế thấp phía trong.
                2. Octave: tư thế thấp phía ngoài.
                3. Khóa lưỡi ở sixte, quarte, septime và octave.
                4. Đổi khóa lưỡi, rồi ép lưỡi. Làm tại chỗ trước, rồi làm khi cả hai đang bước.
                """),
            Unit("Buổi 8. Disengage", """
                Khi đối thủ ép lưỡi, mũi kiếm vòng qua lưỡi đối thủ rồi đâm.
                1. Từ khóa sixte, disengage và lunge.
                2. Từ khóa quarte, disengage và lunge.
                3. Chỉ ra đòn khi đối thủ dừng và ép.
                4. Ngón tay điều khiển mũi, không vung cả cánh tay.
                """, "Dùng các tư thế khóa lưỡi buổi 7."),
            Unit("Buổi 9. Đỡ vòng và trả đòn", """
                1. Đỡ vòng sixte, lưỡi kiếm vòng một vòng để bắt mũi đối thủ, rồi riposte thẳng.
                2. Đỡ vòng quarte, rồi riposte thẳng.
                3. Làm tại chỗ, đối thủ tấn công thẳng.
                4. Nói sự khác nhau giữa đòn đơn và đòn nhiều nhịp: disengage là đòn có đổi đường, đỡ vòng là đỡ có vòng lưỡi.
                """, "Ôn đỡ thẳng buổi 4 trước khi thêm đường vòng."),
            Unit("Buổi 10. Đọ kiếm có trọng tài", """
                1. Nhắc lời cam kết lịch sự và kích thước sàn đấu ở mức mô tả: sân có chiều dài và chiều rộng quy định, ra biên là hết đất đứng.
                2. Một người điều khiển hô bắt đầu và dừng. Người học tập quan sát một hiệp: đòn nào tới trước, có trúng vùng hợp lệ không.
                3. Đọ kiếm tự do trong thời gian ngắn, có giám sát. Chỉ dùng các đòn đã học: tấn công thẳng, lunge, disengage, đỡ thẳng, đỡ vòng, riposte.
                4. Kết thúc bằng chào.
                """, "Dùng lại toàn bộ đòn từ buổi 1 đến buổi 9 trong hiệp có đối thủ thật."),
        ]);

    private static Entry Dance() => new(
        "Kỹ thuật Horton bậc đầu của Ailey, rồi nguyên tắc Graham",
        "https://ailey.org/classes/techniques/horton",
        "Không có liên đoàn nhảy hiện đại công bố một giáo trình buổi. Khóa này xếp đúng nội dung lớp Horton cho người mới của Ailey Extension, rồi các nguyên tắc Graham: thót và thả, chuyển trọng tâm, xoắn, sàn, đứng và di chuyển.",
        [
            Unit("Buổi 1. Làm quen thân và nhịp", """
                Lớp Horton người chưa học bắt đầu bằng nhận biết thân, chưa vào study khó.
                1. Đứng, ngồi và nằm để tìm cột sống dài, vai thả, trọng lượng ở hai bàn chân.
                2. Tendus chậm: chân duỗi ra và thu về, thân không đổ.
                3. Đi theo nhịp trống hoặc nhịp đếm, đổi nhanh và chậm mà không mất hướng.
                4. Một câu đi rất ngắn ở giữa phòng để biết bắt đầu và kết thúc cùng nhạc.
                """),
            Unit("Buổi 2. Flat back", """
                Flat back là một study đầu của Horton: lưng phẳng khi gập từ hông, không cuộn cột sống.
                1. Đứng, gập người đến khi lưng song song sàn, hai tay có thể dang hoặc đưa ra trước theo câu giáo viên chọn.
                2. Giữ, thở, rồi dựng về bằng cách giữ lưng vẫn phẳng.
                3. Làm ở mức thấp hơn và cao hơn để thấy cùng một nguyên tắc.
                4. Không đòi độ gập sâu nếu lưng đã cong.
                """),
            Unit("Buổi 3. Primitive squat", """
                Primitive squat là tư thế ngồi sâu của Horton, lưng dài, gót có thể không chạm sàn tùy cơ thể.
                1. Từ đứng, hạ xuống squat, đầu gối mở, ngực không sụp.
                2. Giữ và đứng lên mà không dùng đà quá mạnh.
                3. Nối flat back rồi vào squat, rồi ngược lại, còn chậm.
                """, "Nối flat back buổi 2 vào đường xuống squat."),
            Unit("Buổi 4. Release swing và leg swing", """
                Release swing và leg swing là hai study bậc đầu.
                1. Release swing: thả thân và tay theo trọng lượng, rồi lấy lại thân đứng. Lực đến từ thả, không từ giật vai.
                2. Leg swing: một chân đu trước sau hoặc sang ngang, chân trụ khuỵu nhẹ, hông yên nhất có thể.
                3. Đổi chân. Biên độ nhỏ trước, rộng sau khi còn thăng bằng.
                """),
            Unit("Buổi 5. Lateral stretch", """
                Lateral stretch là nghiêng sang bên trong Horton, sườn mở, không gục người ra trước.
                1. Nghiêng phải và trái ở tư thế đứng, tay theo đường sườn.
                2. Giữ và trả về giữa.
                3. Nối với release swing: nghiêng, thả, dựng.
                4. Câu ngắn tại chỗ gồm flat back và lateral, mỗi động tác còn nhận ra được.
                """, "Giữ flat back buổi 2 khi câu có gập trước."),
            Unit("Buổi 6. Deep lunge và coccyx balance", """
                Phần sàn của lớp Horton bậc đầu gồm lunge sâu và cân bằng vùng xương cụt.
                1. Lunge sâu về trước, gối sau hạ, hông hướng đã định, thân không đổ sang một bên.
                2. Đổi chân.
                3. Coccyx balance: ngồi, tìm điểm tựa xương cụt, chân và thân ra khỏi sàn ở mức người học giữ được, rồi hạ có kiểm soát.
                4. Nghỉ giữa các lần giữ. Không giữ đến mức mất form.
                """),
            Unit("Buổi 7. T position", """
                T position là study bậc đầu: thân và chân tạo hình chữ T, lưng dài.
                1. Đứng một chân, chân kia duỗi ra sau, thân đổ về trước đến khi gần song song sàn.
                2. Hai tay có thể mở ngang. Mắt nhìn xuống hoặc ra trước theo câu, không ngửa cổ gấp.
                3. Giữ ngắn, đổi chân.
                4. Vào và ra khỏi tư thế bằng một nhịp đếm rõ.
                """, "Dùng thăng bằng một chân đã tập ở leg swing buổi 4."),
            Unit("Buổi 8. Câu giữa phòng", """
                Sau các study riêng, lớp Horton đi vào câu ở giữa phòng.
                1. Ghép đúng thứ tự đã học: tendu, flat back, squat, lateral, swing.
                2. Câu lặp hai lần, lần hai chỉ sửa một điểm.
                3. Có bắt đầu, có kết, cùng hướng mặt.
                4. Chưa thêm nhảy.
                """, "Ôn các study từ buổi 1 đến buổi 7 trong một câu."),
            Unit("Buổi 9. Đi qua phòng", """
                Phần across the floor của lớp Horton dùng các study đã có khi di chuyển.
                1. Đi và đổi hướng, lưng vẫn dài.
                2. Lunge di chuyển, không chỉ lunge tại chỗ.
                3. Swing trong lúc đi, khoảng cách giữa người với người đủ để không va.
                4. Một lượt qua phòng, về hàng, làm lại.
                """),
            Unit("Buổi 10. Graham: thót và thả", """
                Graham lấy hơi thở và cơ hoành làm động cơ. Thót là co phần thân trước, thả là trả thân về.
                1. Ngồi hoặc quỳ, thở ra khi thót, thở vào khi thả. Cổ không gí về trước.
                2. Làm chậm để thấy lưng tròn khi thót và dài khi thả.
                3. Ba lần tại chỗ, nghỉ, rồi nối thành nhịp đều.
                """),
            Unit("Buổi 11. Xoắn, sàn, rồi đứng", """
                Nguyên tắc Graham còn lại là chuyển trọng tâm và xoắn, làm trên sàn trước khi đi.
                1. Ngồi, xoắn thân sang phải và trái, hông giữ càng yên càng tốt.
                2. Chuyển trọng tâm từ bên này sang bên kia trên sàn.
                3. Đứng lên từ sàn bằng cách dùng thót và thả, không kéo người bằng vai.
                4. Lặp câu sàn một lần nữa, ngắn hơn.
                """, "Dùng thót và thả buổi 10 để vào và ra khỏi sàn."),
            Unit("Buổi 12. Câu di chuyển và trình diễn ngắn", """
                Graham bậc đầu kết bằng mẫu đứng và đi qua phòng. Buổi này ghép với câu Horton đã có.
                1. Một câu Graham ngắn: thót, thả, xoắn, bước.
                2. Một câu Horton ngắn đã học ở buổi 8, đi được qua phòng.
                3. Ghép hai câu thành một đoạn khoảng một phút, có mở và có kết.
                4. Chạy lại đoạn đó một lần sau khi được một nhận xét về hướng và nhịp, không thêm động tác mới.
                """, "Ôn câu Horton buổi 8 và nguyên tắc Graham buổi 10, 11."),
        ]);

    private static Entry Golf() => new(
        "Tiến trình dạy người mới trên buồng golf trong nhà, dùng cho Golf 3D",
        "https://www.golftec.com/golf-lessons",
        "Không có giáo trình Golf 3D của một liên đoàn. Khóa này chỉ dùng buồng mô phỏng: gậy sắt giữa trước, xem đường bóng trên màn hình, chưa đọc bảng số, rồi mới thêm một chỉ số, mục tiêu và gậy driver. Không chép giáo trình sân cỏ.",
        [
            Unit("Buổi 1. Bóng bay trên màn hình", """
                Buồng 3D cho người mới xem đường bóng, chưa mở bảng góc phóng và độ xoáy.
                1. Chọn gậy sắt giữa, không dùng driver.
                2. Vào chế độ sân tập, không tính điểm.
                3. Hai mươi đến ba mươi phút chỉ cần chạm bóng và thấy bóng bay trên màn hình.
                4. Dừng khi còn một cú bay ổn, không đánh đến lúc mệt.
                """),
            Unit("Buổi 2. Cầm gậy", """
                1. Cầm sao cho hai bàn tay cùng làm một khối, không siết cứng.
                2. Kiểm tra từng người trước khi đánh.
                3. Đánh nửa vòng với cùng cây sắt giữa. Chỉ sửa cách cầm, không sửa cả đường swing.
                4. Nhìn màn hình để biết bóng có bay không, chưa bàn số liệu.
                """, "Giữ nhiệm vụ buổi 1: chạm bóng và thấy bóng bay."),
            Unit("Buổi 3. Tư thế và hướng", """
                Ba việc quyết định phần lớn đường bóng trước khi swing: cầm gậy, tư thế, hướng.
                1. Gối mềm, người đổ từ hông, hai tay thả.
                2. Đặt hai gậy hoặc hai vạch trên thảm: một vạch theo hướng mục tiêu, một vạch theo hai mũi chân.
                3. Mỗi cú đều đứng lại, nhìn mục tiêu trên màn hình, rồi mới đánh.
                4. So sánh hướng chân với hướng bóng bay. Lệch hướng thì sửa thế đứng trước, chưa sửa mặt gậy bằng số.
                """, "Giữ cách cầm buổi 2."),
            Unit("Buổi 4. Chạm giữa mặt gậy", """
                Cự ly chỉ tính sau khi chạm đều. Buổi này chưa hỏi đánh xa.
                1. Vẫn gậy sắt giữa và vạch hướng.
                2. Đánh chậm, nghe và nhìn điểm chạm. Bóng mỏng hoặc trúng cổ gậy thì đánh lại cùng một ý, không đổi gậy.
                3. Khi một loạt ngắn đã bay đi, mới xem bóng đi thẳng, kéo hay trượt trên màn hình.
                4. Kết thúc bằng một cú chạm giữa mặt gậy, dù chưa xa.
                """),
            Unit("Buổi 5. Nhịp", """
                1. Khởi động bằng nửa vòng, gậy sắt ngắn hoặc gậy đang dùng, tìm nhịp và tiếp xúc sạch.
                2. Một ý duy nhất: cùng một nhịp cho cả loạt, không tăng tốc ở cuối.
                3. Xem lại một cú trên video của buồng nếu máy có, chỉ để đối chiếu nhịp người học cảm thấy với hình, không phân tích cả swing.
                4. Dừng đúng giờ ngắn. Người mới đánh quá lâu sẽ lặp lỗi lúc đã mệt.
                """, "Chỉ tăng nhịp khi cú chạm giữa mặt gậy của buổi 4 còn giữ được."),
            Unit("Buổi 6. Một chỉ số trên màn hình", """
                Khi chạm bóng đã lặp lại, mới bật một dữ liệu.
                1. Chọn một số, ví dụ hướng mặt gậy lúc chạm hoặc hướng xuất phát. Tắt các số còn lại.
                2. Đánh một loạt cùng cây gậy, cùng mục tiêu.
                3. Mỗi cú xấu chỉ sửa đúng số đang xem, không đổi sang chỉ số khác trong buổi.
                4. Ghi lại số đó để buổi sau còn so.
                """, "Nếu chạm bóng buổi 4 bị vỡ thì tắt số và quay lại chỉ xem đường bóng."),
            Unit("Buổi 7. Bắn mục tiêu", """
                Vẫn ở chế độ sân tập của buồng, chưa vào lỗ.
                1. Chọn một mục tiêu trên màn hình.
                2. Đủ bước chuẩn bị: hướng, tư thế, rồi mới đánh.
                3. Đổi mục tiêu sau mỗi cú, chưa đổi gậy.
                4. Đếm số bóng vào vùng mục tiêu, không đếm cú xa nhất.
                """, "Dùng hướng buổi 3 và nhịp buổi 5."),
            Unit("Buổi 8. Đổi gậy và driver", """
                Driver là gậy khó nhất, để sau khi sắt giữa đã bay ổn định.
                1. Vài cú sắt giữa để lấy lại chạm bóng.
                2. Đổi sang một gậy sắt khác, cùng cách đứng và cùng nhịp. Xem cự ly mang bóng trên màn hình, không cộng cú lăn của sân cỏ vì buồng không có mặt cỏ thật.
                3. Nếu loạt sắt còn chạm giữa mặt gậy, mới đánh một loạt driver ngắn, cùng vạch hướng.
                4. Kết bằng vài cú sắt giữa, không kết bằng những cú driver hỏng.
                """, "Driver chỉ thêm sau khi cú sắt của các buổi trước còn lặp được."),
            Unit("Buổi 9. Một lỗ trên sân 3D", """
                Vào một lỗ ngắn trên phần mềm, không phải sân cỏ.
                1. Chọn gậy theo cự ly mang bóng đã thấy ở buổi 8.
                2. Mỗi cú vẫn có bước nhìn mục tiêu và đứng vào vạch.
                3. Không mở lại toàn bộ bảng số. Chỉ nhìn bóng bay và khoảng cách còn lại đến lỗ trên màn hình.
                4. Chơi hết lỗ hoặc hết thời gian ngắn. Nói lại cú nào chạm đúng và cú nào chỉ đánh mạnh.
                """, "Dùng cách chọn gậy và đường bóng của buổi 7 và buổi 8."),
        ]);
}
