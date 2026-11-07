namespace AnhDuySport.Api.Data;

// Bảy môn có chuỗi liên đoàn giữ nguyên thứ tự đã công bố.
// Năm môn không có thời khóa biểu cố định được xếp từ thứ tự kỹ năng đã đọc, sau khi được phép tự lập giáo trình.
public static partial class OfficialCourseCatalog
{
    public sealed record Entry(string SourceName, string SourceUrl, string Note, IReadOnlyList<(string Label, string Work, string Review)> Units);

    public static bool TryGet(string sportCode, out Entry entry)
    {
        entry = sportCode switch
        {
            "badminton" => Badminton(),
            "swimming" => Swimming(),
            "volleyball" => Volleyball(),
            "basketball" => Basketball(),
            "chess" => Chess(),
            "tennis" => Tennis(),
            "taekwondo" => Taekwondo(),
            "soccer" => Soccer(),
            "tabletennis" => TableTennis(),
            "fencing" => Fencing(),
            "dance" => Dance(),
            "golf" => Golf(),
            _ => null!,
        };
        return entry is not null;
    }

    private static Entry Empty(string source, string url, string note) => new(source, url, note, []);

    private static Entry Taekwondo() => new(
        "Kukkiwon, bài quyền đai màu Taegeuk",
        "https://www.kukkiwon.or.kr/eng/board/list?boardManagementNo=55&menuLevel=3&menuNo=72",
        "Kukkiwon công bố chuỗi bài quyền đai màu từ Taegeuk 1 Jang đến Taegeuk 8 Jang. Mỗi bài ghi đủ ý nghĩa Kukkiwon đã đăng và đủ nhịp trong sơ đồ bài quyền.",
        [
            Unit("Taegeuk 1 Jang", """
                Kukkiwon: bài ứng với quẻ Keon, trời, quẻ đầu của bát quái, biểu thị trời và ánh sáng. Keon chỉ dương trong quan hệ âm dương của thái cực, là khí mở đầu cho vạn vật. Keon ứng với đầu, nên bài quyền đầu tiên nhằm hiểu đúng động tác cơ bản và tiếp thu kỹ thuật.
                Sơ đồ bắt đầu ở thế song song, kibon junbi-seogi, mắt hướng Ga, thân ở Na. Bài chủ yếu là thế đi, đỡ thấp, đỡ giữa, đấm thân và đá trước. Sơ đồ ghi cho người tập cấp 8 kup.
                1. Hướng Da 1, thế đi chân trái, bước chân, arae-makki (đỡ thấp).
                2. Vẫn Da 1, thế đi chân phải, bước chân, momtong bandae-jireugi (đấm thân đối bên).
                3. Quay sang Ra 1, thế đi chân phải, arae-makki.
                4. Vẫn Ra 1, thế đi chân trái, bước chân, momtong bandae-jireugi.
                5. Quay về Ga, thế trước dài chân trái, arae-makki.
                6. Giữ nguyên thế trước dài chân trái, momtong baro-jireugi (đấm thân thuận).
                7. Sang Ra 2, thế đi chân phải, di chuyển rồi hạ chân, momtong an-makki (đỡ thân vào trong).
                8. Vẫn Ra 2, thế đi chân trái, bước chân, momtong baro-jireugi.
                9. Quay sang Da 2, thế đi chân trái, momtong an-makki.
                10. Vẫn Da 2, thế đi chân phải, bước chân, momtong baro-jireugi.
                11. Quay về Ga, thế trước dài chân phải, arae-makki.
                12. Giữ nguyên thế trước dài chân phải, momtong baro-jireugi.
                13. Sang Da 3, thế đi chân trái, di chuyển rồi hạ chân, olgul-makki (đỡ mặt).
                14. Vẫn Da 3, thế đi chân phải: chân phải đá trước rồi hạ chân, momtong bandae-jireugi.
                15. Quay sang Ra 3, thế đi chân phải, olgul-makki.
                16. Vẫn Ra 3, thế đi chân trái: chân trái đá trước rồi hạ chân, momtong bandae-jireugi.
                17. Về Na, thế trước dài chân trái, di chuyển rồi hạ chân, arae-makki.
                18. Vẫn Na, thế trước dài chân phải, bước chân, momtong bandae-jireugi, có kihap.
                Kết thúc: kéo chân trái, quay trái, về kibon junbi-seogi, mắt hướng Ga, thân ở Na.
                """),
            Unit("Taegeuk 2 Jang", """
                Kukkiwon: quẻ Tae, mặt hồ tĩnh. Trên cơ thể, bài này là luyện giữ hơi thở và cảm xúc. Khi tập phải dồn khí xuống bụng dưới, không để khí thoát ra ngoài vì các động tác. Có kỹ thuật mà không giữ được hơi thở và cảm xúc thì khó tấn công và phòng thủ chính xác. Tập như mặt hồ yên nhưng có chiều sâu, đạt trạng thái nắm đấm sắt trong găng nhung.
                Sơ đồ: đỡ mặt xuất hiện như phần mới so với bài 1, và đá trước dày hơn bài 1. Dùng cho cấp 7 kup. Mở đầu kibon junbi-seogi.
                1. Da 1, thế đi chân trái, bước chân, arae-makki.
                2. Da 1, thế trước dài chân phải, bước chân, momtong bandae-jireugi.
                3. Quay Ra 1, thế đi chân phải, arae-makki.
                4. Ra 1, thế trước dài chân trái, bước chân, momtong bandae-jireugi.
                5. Quay về Ga, thế đi chân trái, momtong an-makki.
                6. Ga, thế đi chân phải, bước chân, momtong an-makki.
                7. Da 2, thế đi chân trái, di chuyển rồi hạ chân, arae-makki.
                8. Da 2, thế trước dài chân phải: chân phải đá trước rồi hạ chân, olgul bandae-jireugi (đấm mặt đối bên).
                9. Quay Ra 2, thế đi chân phải, arae-makki.
                10. Ra 2, thế trước dài chân trái: chân trái đá ngang rồi hạ chân, olgul bandae-jireugi.
                11. Quay về Ga, thế đi chân trái, olgul-makki.
                12. Ga, thế đi chân phải, bước chân, olgul-makki.
                13. Quay Ra 3, thế đi chân trái, momtong an-makki.
                14. Da 3, thế đi chân phải, giữ chân và đổi hướng, momtong an-makki.
                15. Na, thế đi chân trái, di chuyển rồi hạ chân, arae-makki.
                16. Na, thế đi chân phải: chân phải đá trước rồi hạ chân, momtong bandae-jireugi.
                17. Na, thế đi chân trái: đá trước rồi hạ chân, momtong bandae-jireugi.
                18. Na, thế đi chân phải: đá trước rồi hạ chân, momtong bandae-jireugi, có kihap.
                Kết thúc: kéo chân trái, quay trái, về kibon junbi-seogi.
                """),
            Unit("Taegeuk 3 Jang", """
                Kukkiwon: quẻ Ri, lửa và sự sáng như mặt trời, ứng với tim, là quá trình xây tinh thần dám làm. Lửa bắt đầu từ tia nhỏ rồi lan rất nhanh. Lực và ánh sáng lan không kiểm soát không giúp việc tập bài quyền. Bài này luyện lực và kỹ thuật đúng với tính chất lửa và ánh sáng, tập các động tác dứt khoát bằng cách nối phòng thủ với tấn công.
                Sơ đồ ghi kỹ thuật mới: sonnal mok-chigi, sonnal makki và thế sau. Bài có chuỗi đỡ rồi đánh, đá rồi đấm liên tiếp. Trọng tâm là phản công khi đối phương đánh. Dùng cho cấp 6 kup. Mở đầu kibon junbi-seogi.
                1. Da 1, thế đi chân trái, bước chân, arae-makki.
                2. Da 1, thế trước dài chân phải: chân phải đá trước rồi hạ chân, momtong dubeon-jireugi (đấm thân hai nhịp).
                3. Quay Ra 1, thế đi chân phải, arae-makki.
                4. Ra 1, thế trước dài chân trái: chân trái đá trước rồi hạ chân, momtong dubeon-jireugi.
                5. Quay Ga, thế đi chân trái, jebi-poom hansonnal mok-chigi (đánh cổ bằng lưỡi tay một tay, kiểu én).
                6. Ga, thế đi chân phải, bước chân, lặp đòn ở nhịp 5.
                7. Da 2, thế sau chân phải, chân trái di chuyển rồi hạ, hansonnal momtong yop-makki (đỡ bên thân bằng lưỡi tay một tay).
                8. Da 2, thế trước dài chân trái, đẩy nhẹ chân trái, momtong baro-jireugi.
                9. Ra 2, thế sau chân trái, kéo nhẹ chân phải, hansonnal momtong yop-makki.
                10. Ra 2, thế trước dài chân phải, đẩy nhẹ chân phải, momtong baro-jireugi.
                11. Ga, thế đi chân trái, di chuyển rồi hạ chân, momtong an-makki.
                12. Ga, thế đi chân phải, bước chân, momtong an-makki.
                13. Quay Ra 3, thế đi chân trái, arae-makki.
                14. Ra 3, thế trước dài chân phải: chân phải đá trước rồi hạ chân, momtong dubeon-jireugi.
                15. Quay Da 3, thế đi chân phải, arae-makki.
                16. Da 3, thế trước dài chân trái: chân trái đá trước rồi hạ chân, momtong dubeon-jireugi.
                17. Quay Na, thế đi chân trái, kèm arae-makki, momtong baro-jireugi.
                18. Na, thế đi chân phải, bước chân kèm arae-makki, momtong baro-jireugi.
                19. Na, thế đi chân trái: chân trái đá trước, hạ chân và arae-makki, momtong baro-jireugi.
                20. Na, thế đi chân phải: chân phải đá trước, hạ chân và arae-makki, momtong baro-jireugi, có kihap.
                Kết thúc: chân trái quay trái, về kibon junbi-seogi.
                """),
            Unit("Taegeuk 4 Jang", """
                Kukkiwon: quẻ Jin, sấm chớp tức thì. Phương Đông gọi Jin là rồng trời. Trên cơ thể, bài này là sự linh hoạt của hai bàn chân để di chuyển nhanh và đá mạnh. Dùng chân để xoay người, đổi hướng hoặc tấn công, khai thác khoảng cách với đối phương như rồng luôn đổi hình.
                Sơ đồ ghi kỹ thuật mới: sonnal momtong-makki, pyonsonkkeut tzireugi, jebi-poom mok-chigi, yop-chagi, momtong bakkat-makki, deungjumeok olgul ap-chigi và bước trượt mikkeurombal. Nhiều thế sau, chuẩn bị cho đối kháng. Dùng cho cấp 5 kup. Mở đầu kibon junbi-seogi.
                1. Da 1, thế sau chân phải, bước chân, sonnal momtong-makki (đỡ thân bằng lưỡi tay).
                2. Da 1, thế trước dài chân phải, bước chân, pyonsonkkeut sewotzireugi (đâm thẳng bằng đầu ngón tay xòe).
                3. Quay Ra 1, thế sau chân trái, sonnal momtong-makki.
                4. Ra 1, thế trước dài chân trái, bước chân, pyonsonkkeut sewotzireugi.
                5. Quay Ga, thế trước dài chân trái, jebi-poom mok-chigi.
                6. Ga, thế trước dài chân phải: chân phải đá trước rồi hạ chân, momtong baro-jireugi.
                7. Ga, chân trái đá ngang. Sơ đồ không ghi thêm thế đứng hay đòn tay ở nhịp này.
                8. Ga, thế sau chân trái: chân phải đá ngang rồi hạ chân, sonnal momtong-makki.
                9. Quay Ra 3, thế sau chân phải, momtong bakkat-makki (đỡ thân ra ngoài).
                10. Ra 3, vẫn thế sau chân phải: chân phải đá trước rồi đặt lại, momtong an-makki.
                11. Da 3, thế sau chân trái, giữ chân và đổi hướng, momtong bakkat-makki.
                12. Da 3, vẫn thế sau chân trái: chân trái đá trước rồi đặt lại, momtong an-makki.
                13. Na, thế trước dài chân trái, di chuyển rồi hạ chân, jebi-poom mok-chigi.
                14. Na, thế trước dài chân phải: chân phải đá trước rồi bước, deungjumeok olgul ap-chigi (đánh mặt bằng mu nắm đấm).
                15. Ra 2, thế đi chân trái, di chuyển rồi hạ chân, momtong-makki.
                16. Ra 2, giữ thế đi chân trái, momtong baro-jireugi.
                17. Da 2, thế đi chân phải, giữ chân và đổi hướng, momtong-makki.
                18. Da 2, giữ thế đi chân phải, momtong baro-jireugi.
                19. Na, thế trước dài chân trái, di chuyển rồi hạ chân, momtong-makki.
                20. Na, thế trước dài chân phải, bước chân, momtong dubeon-jireugi, có kihap.
                Kết thúc: chân trái quay trái, về kibon junbi-seogi.
                """),
            Unit("Taegeuk 5 Jang", """
                Kukkiwon: quẻ Son, gió, hiền nhưng có thể thành bão. Ứng với khung chậu và khớp hông. Cơ quanh vùng này phải thả lỏng để có tư thế vững và có lực. Đây là bệ đỡ cột sống, giúp tư thế ổn định và linh hoạt, đồng thời là nguồn lực xoay và lực đá. Bài luyện kỹ thuật ở nhiều tư thế để ra lực theo nhiều cách, như cơn bão khó đoán.
                Sơ đồ ghi kỹ thuật mới: mejumeok naeryo-chigi, palkup dollyo-chigi, đá ngang kèm đấm ngang, palkup pyojeok-chigi, và các thế kkoa-seogi, wen-seogi, oreun-seogi. Có chuỗi đỡ thấp rồi đỡ thân, và đòn đánh sau khi chạy vào. Dùng cho cấp 4 kup. Mở đầu kibon junbi-seogi.
                1. Da 1, thế trước dài chân trái, bước chân, arae-makki.
                2. Da 1, thế wen-seogi, thu chân, mejumeok naeryo-chigi (đánh xuống bằng nắm búa).
                3. Đổi hướng Ra 1, thế trước dài chân phải, bước chân, arae-makki.
                4. Ra 1, thế oreun-seogi, thu chân, mejumeok naeryo-chigi.
                5. Ga, thế trước dài chân trái, bước chân kèm momtong-makki, momtong an-makki.
                6. Ga, thế trước dài chân phải: chân phải đá trước, bước, deungjumeok ap-chigi, momtong an-makki.
                7. Ga, thế trước dài chân trái: chân trái đá trước, bước, deungjumeok ap-chigi, momtong an-makki.
                8. Ga, thế trước dài chân phải, bước chân, deungjumeok ap-chigi.
                9. Quay Ra 3, thế sau chân phải, hansonnal yop-makki.
                10. Ra 3, thế trước dài chân phải, bước chân, palkup dollyo-chigi (đánh vòng bằng khuỷu).
                11. Quay Da 3, thế sau chân trái, hansonnal yop-makki.
                12. Da 3, thế trước dài chân trái, bước chân, palkup dollyo-chigi.
                13. Quay Na, thế trước dài chân trái, kèm arae-makki, momtong an-makki.
                14. Na, thế trước dài chân phải: chân phải đá trước, bước, kèm arae-makki, momtong an-makki.
                15. Ra 2, thế trước dài chân trái, bước, olgul-makki.
                16. Ra 2, thế trước dài chân phải: chân phải đá ngang rồi bước, palkup pyojeok-chigi (khuỷu đánh vào mục tiêu).
                17. Quay Da 2, thế trước dài chân phải, olgul-makki.
                18. Da 2, thế trước dài chân trái: chân trái đá ngang rồi bước, palkup pyojeok-chigi.
                19. Quay Na, thế trước dài chân trái, kèm arae-makki, momtong an-makki.
                20. Na, thế dwikkoa-seogi: chân phải đá trước rồi bước, deungjumeok ap-chigi, có kihap.
                Kết thúc: kéo chân trái, quay trái, về kibon junbi-seogi.
                """),
            Unit("Taegeuk 6 Jang", """
                Kukkiwon: quẻ Gam, nước chảy, ứng với tai, gồm nghe âm thanh và cảm được lực xung quanh vừa chắc vừa mềm. Bài luyện cách gạt lực đối phương rồi phản công, như nước chảy qua vật cản. Kỹ thuật phải liền mạch dù đường rộng hay hẹp, có vật cản hay không. Nước đôi khi đổ thành thác, nên bài cũng có lúc bung toàn bộ lực, rồi nối lại các kỹ thuật.
                Sơ đồ ghi kỹ thuật mới: hansonnal olgul bakkat-makki, dollyo-chagi, olgul bakkat-makki, batangson momtong-makki, và thế pyonhi-seogi. Sau đá vòng, bàn chân đá phải đáp đúng. Khi đỡ thân bằng lòng bàn tay, tay hạ thấp hơn đỡ bằng cổ tay khoảng một lòng bàn tay. Dùng cho cấp 3 kup. Mở đầu kibon junbi-seogi.
                1. Da 1, thế trước dài chân trái, bước chân, arae-makki.
                2. Da 1, thế sau chân phải: chân phải đá trước rồi thu chân, momtong bakkat-makki.
                3. Đổi hướng Ra 1, thế trước dài chân phải, đẩy nhẹ chân phải, arae-makki.
                4. Ra 1, thế sau chân trái: chân trái đá trước rồi thu chân, momtong bakkat-makki.
                5. Quay Ga, thế trước dài chân trái, hansonnal bitureo-makki (đỡ xoắn bằng lưỡi tay một tay).
                6. Da 2, thế trước dài chân trái: chân phải đá vòng, bước chân trái, olgul bakkat-makki, rồi momtong baro-jireugi.
                7. Da 2, thế trước dài chân phải: chân phải đá trước rồi bước, momtong baro-jireugi.
                8. Quay Ra 2, thế trước dài chân phải, kèm olgul bakkat-makki, momtong baro-jireugi.
                9. Ra 2, thế trước dài chân trái: chân trái đá trước rồi bước, momtong baro-jireugi.
                10. Ga, thế song song, chân trái bước, arae hecho-makki (đỡ đẩy thấp).
                11. Ga, thế trước dài chân phải, bước chân, hansonnal bitureo-makki.
                12. Da 3, thế trước dài chân phải: chân trái đá vòng, có kihap, chân chuyển sang đường Da 3 rồi quay, arae-makki.
                13. Da 3, thế sau chân trái: chân trái đá ngang rồi thu chân, momtong bakkat-makki.
                14. Đổi hướng Ra 3, thế trước dài chân trái, đẩy nhẹ chân trái, arae-makki.
                15. Ra 3, thế sau chân phải: chân phải đá trước rồi thu chân, momtong bakkat-makki.
                16. Từ Ga về Na, thế sau chân phải, bước chân phải, sonnal momtong-makki.
                17. Na, thế sau chân trái, thu chân trái rồi hạ, sonnal momtong-makki.
                18. Na, thế trước dài chân trái, thu chân phải, batangson momtong-makki rồi momtong baro-jireugi.
                19. Na, thế trước dài chân phải, thu chân trái, batangson momtong-makki rồi momtong baro-jireugi.
                Kết thúc: kéo chân trái, quay trái, về kibon junbi-seogi.
                """),
            Unit("Taegeuk 7 Jang", """
                Kukkiwon: quẻ Gan, dãy núi chắc, sống núi uốn và chỗ núi nối nhau. Ứng với cột sống, với gập và duỗi của khớp và đốt sống. Núi không chỉ là đất: có mạch nước ngầm trong đá. Đất, đá và nước ngầm lần lượt ứng với cơ, khớp, mạch máu và thần kinh. Giai đoạn này luyện ra lực cùng với việc dùng sự gập và duỗi của khớp và cơ cho hiệu quả.
                Sơ đồ ghi kỹ thuật mới: sonnal arae-makki, batangson kodureo-makki, bojumeok, kawi-makki, mureup-chigi, momtong hecho-makki, đấm đẩy, otkoreo arae-makki, pyojeok-chigi, đấm ngang, và thế beom-seogi, juchum-seogi. Các động tác phải nối trơn. Dùng cho cấp 2 kup. Mở đầu kibon junbi-seogi.
                1. Da 1, thế hổ chân trái, bước chân trái, batangson momtong an-makki (đỡ thân vào trong bằng lòng bàn tay).
                2. Giữ thế, chân phải đá trước rồi thu chân, momtong-makki.
                3. Ra 1, thế hổ chân phải, giữ chân và đổi hướng, batangson momtong an-makki.
                4. Giữ thế, chân trái đá trước rồi thu chân, momtong-makki.
                5. Quay Ga, thế sau chân phải, sonnal arae-makki (đỡ thấp bằng lưỡi tay).
                6. Ga, thế sau chân trái, bước chân, lặp đòn ở nhịp 5.
                7. Da 2, thế hổ chân trái, đổi chân, batangson kodureo momtong an-makki (đỡ thân vào trong có tay hỗ trợ).
                8. Giữ thế, deungjumeok olgul ap-chigi.
                9. Đổi hướng Ra 2, thế hổ chân phải, batangson kodureo momtong an-makki.
                10. Giữ vị trí và thế, deungjumeok olgul ap-chigi.
                11. Ga, thế khép chân, kéo chân trái về, bojumeok (nắm đấm bọc).
                12. Ga, thế trước dài chân trái, bước và đỡ đối bên, kawi-makki (đỡ kéo).
                13. Ga, thế trước dài chân phải, lặp kawi-makki.
                14. Quay Ra 3, thế trước dài chân trái, momtong hecho-makki (đỡ đẩy thân).
                15. Ra 3, thế dwikkoa-seogi: đánh gối, chân phải nhảy bước, jecho-jireugi (đấm đẩy).
                16. Ra 3, thế trước dài chân phải, thu chân trái, otgoreo arae-makki (đỡ thấp bắt chéo).
                17. Quay Da 3, thế trước dài chân phải, momtong hecho-makki.
                18. Da 3, thế dwikkoa-seogi: đánh gối, chân trái nhảy bước, jecho-jireugi.
                19. Da 3, thế trước dài chân trái, thu chân phải, otgoreo arae-makki.
                20. Quay Na, thế đi chân trái, deungjumeok bakkat-chigi (đánh ra ngoài bằng mu nắm đấm).
                21. Na, thế cưỡi ngựa: chân phải đá vào mục tiêu rồi bước, palkup pyojeok-chigi.
                22. Na, thế đi chân phải, người dựng lên, kéo nhẹ chân trái, deungjumeok bakkat-chigi.
                23. Na, thế cưỡi ngựa: chân trái đá vào mục tiêu rồi bước, palkup pyojeok-chigi.
                24. Giữ thế, hansonnal yop-makki.
                25. Giữ thế, bước chân phải, momtong yop-jireugi (đấm ngang thân), có kihap.
                Kết thúc: kéo chân trái, quay trái, về kibon junbi-seogi.
                """),
            Unit("Taegeuk 8 Jang", """
                Kukkiwon: quẻ Gon, đất, nơi vạn vật bám rễ và sinh sống, mang tính âm. Gon ứng với bụng, phần bảo vệ nội tạng. Keon ở bài 1 là khởi đầu của vạn vật. Gon là mặt đất để vạn vật lớn lên và kết quả. Mọi lực của người cũng phát từ bụng. Giai đoạn này tăng sức bụng và luyện tấn công bằng cả thân khi hai chân rời đất. Nối phần trên và phần dưới của thân thì bảy giai đoạn trước được hoàn tất.
                Sơ đồ: đây là bài Taegeuk cuối, dùng trước kỳ kiểm tra lên đẳng. Kỹ thuật mới gồm đỡ ngoài có tay hỗ trợ bằng cổ tay ngoài, đá nhảy, và khuỷu đánh vòng. Phải chính xác bước chân, và phân biệt đá nhảy qua với dubal-dangsong, tức hai chân lần lượt rời đất. Dùng cho cấp 1 kup. Mở đầu kibon junbi-seogi.
                1. Ga, thế sau chân phải, bước chân trái, kodureo bakkat-makki (đỡ ngoài có tay hỗ trợ).
                2. Ga, thế trước dài chân trái, giữ vị trí, momtong baro-jireugi.
                3. Ga, thế trước dài chân trái: hai chân dangsong đá trước, có kihap, bước chân, momtong-makki, rồi momtong dubeon-jireugi.
                4. Ga, thế trước dài chân phải, bước chân phải, momtong bandae-jireugi.
                5. Quay Ra 3, chân trái bước rồi hạ, wesanteul-makki (đỡ mở rộng một tay).
                6. Ra 3, thế trước dài chân trái, giữ chân và chuyển trọng tâm, dangkyo teok-jireugi (kéo rồi đấm hàm).
                7. Da 3, chân trái thế bắt chéo rồi chân phải bước, wesanteul-makki.
                8. Da 3, thế trước dài chân phải, giữ chân và chuyển trọng tâm, dangkyo teok-jireugi.
                9. Từ Ga về Na, thế sau chân phải, bước chân phải, sonnal momtong-makki.
                10. Na, thế trước dài chân phải, giữ chân, momtong baro-jireugi.
                11. Na, thế hổ chân phải: chân phải đá trước rồi thu, chân trái lùi một bước, batangson momtong-makki.
                12. Da 2, thế hổ chân trái, bước chân trái, sonnal momtong-makki.
                13. Da 2, thế trước dài chân trái: chân trái đá trước rồi bước, momtong baro-jireugi.
                14. Da 2, thế hổ chân trái, kéo chân trái, batangson momtong-makki.
                15. Da 2, thế hổ chân phải, đổi hướng, sonnal momtong-makki.
                16. Ra 2, thế trước dài chân phải: chân phải đá trước rồi bước, momtong baro-jireugi.
                17. Ra 2, thế hổ chân phải, kéo chân phải, batangson momtong-makki.
                18. Quay Na, thế sau chân trái, kodureo arae-makki (đỡ thấp có tay hỗ trợ).
                19. Na, thế trước dài chân phải: chân trái đá trước, chân phải đá trước nhảy, có kihap, rồi bước, momtong dubeon-jireugi.
                20. Quay Da 1, thế sau chân phải, hansonnal momtong yop-makki.
                21. Da 1, thế trước dài chân trái, giữ chân phải và đẩy chân trái, oreun palkup dollyo-chigi (khuỷu phải đánh vòng).
                22. Giữ thế trước dài chân trái, deungjumeok bandae-jireugi.
                23. Giữ thế, momtong bandae-jireugi.
                24. Đổi hướng Ra 1, thế sau chân trái, hansonnal momtong yop-makki.
                25. Ra 1, thế trước dài chân phải, giữ chân trái và đẩy chân phải, wen palkup dollyo-chigi (khuỷu trái đánh vòng).
                26. Giữ thế, deungjumeok ap-chigi.
                27. Giữ thế, momtong bandae-jireugi.
                Kết thúc: kéo chân trái, về kibon junbi-seogi.
                """),
        ]);

    private static (string Label, string Work, string Review) Unit(string label, string work, string review = "") => (label, work, review);
}
