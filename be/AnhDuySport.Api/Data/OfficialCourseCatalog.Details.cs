namespace AnhDuySport.Api.Data;

public static partial class OfficialCourseCatalog
{
    private static Entry Badminton() => new(
        "BWF Shuttle Time, Schools Badminton Programme, Lesson Plans 2023",
        "https://shuttletime.bwfbadminton.com/wp-content/uploads/2023/09/2.-BWF-ST-SBP_Lesson-Plans_ENG_DIGITAL.pdf",
        "22 buổi theo mục lục BWF. Mỗi buổi có mở đầu, các hoạt động đúng tên trong giáo án, rồi phần tóm tắt cuối buổi.",
        [
            Unit("Buổi 1. Basic Grips", """
                Cuối buổi học viên nêu được cầu lông là môn như thế nào, làm được cầm trái tay (thumb) và cầm thuận (V), với tay thoải mái khi đỡ cầu hoặc bóng mềm.
                1. Mở đầu: nêu hai cách cầm và tầm với.
                2. Balloon tap: từng cặp chạy, vỗ bóng bay bằng tay cho bóng không chạm sàn, rồi vỗ bằng tay cầm vợt.
                3. Balloon tap relay: từng đội chuyền bóng bay qua đường chạy, người sau nhận bóng từ người trước.
                4. Backhand thumb grip with balloon: giữ bóng bay bằng cầm trái tay, mu bàn tay dẫn lên và ra khỏi thân.
                5. Forehand basic V grip with balloon: giữ bóng bay bằng cầm thuận, ngón xòe, chạm bóng trước thân, có hình chữ V giữa ngón cái và ngón trỏ.
                6. Grip change with balloon: ba lần cầm trái tay rồi ba lần cầm thuận, sau đó rút còn hai-hai và đổi luân phiên.
                7. Cuối buổi: nhắc lại trọng tâm và giãn cơ.
                """),
            Unit("Buổi 2. Grip Changes and Footwork", """
                Cuối buổi làm được bước chasse ở khoảng ngắn và đổi cách cầm trong tình huống đã biết trước.
                1. Mở đầu: chasse và đổi cầm.
                2. Mirror chase: một người dẫn, một người đuổi, chỉ chasse ngang ở khoảng ngắn, đổi vai thường xuyên, gối hơi khuỵu.
                3. Mirror chase with throwing: người dẫn ném túi hoặc cầu, người đuổi bắt và trả.
                4. Grip change Tic-Toc: lăn cán vợt bằng ngón cái để đổi cầm, khuỷu trước thân, chỉ siết tay lúc đánh. Giáo viên đổi nhịp như tiếng tích tắc.
                5. Grip change with shuttle: cặp đổi cầm khi đánh cầu đồng đội ném luân phiên thuận và trái, 12 quả rồi đổi vai, không cần lưới.
                6. Hitting with change of grips: tiến lên đánh vào mục tiêu, có hoặc không có lưới.
                7. Cuối buổi: nhắc lại trọng tâm và giãn cơ.
                """, "Cuối buổi nhắc lại điểm chính của buổi."),
            Unit("Buổi 3. Net and Lunge", """
                Cuối buổi lunge đủ tầm, mũi chân trước hướng điểm chạm cầu, và đánh cầu lưới bằng động tác đẩy với cách cầm đúng.
                1. Mở đầu: lưới và lunge.
                2. Balance and throw: đứng một chân, ném và bắt cầu với bạn, rồi đổi chân.
                3. Balancing shuttles: đội cầu úp trên đầu và bước lunge. Nhấc gối trước khi đưa bàn chân, chạm sàn bằng gót, thân thẳng.
                4. Having a lunge: cả nhóm bước chân cầm vợt ra trước và đánh bóng lưới không cầu.
                5. Net shots backhand and forehand: một người ném cầu qua lưới, người kia đẩy nhẹ gần mặt trên lưới, rồi thêm lunge. Làm trái tay trước, thuận sau, 12 quả rồi đổi.
                6. Playing a net rally: chỉ đánh cầu thấp hơn mặt lưới, bắt đầu bằng cách ném cầu.
                7. Cuối buổi: nhắc lại điểm chính của buổi 2 và buổi 3, nhấn đỡ lưới trái tay và lunge.
                """, "Cuối buổi nhắc lại điểm chính của buổi 2 và buổi 3."),
            Unit("Buổi 4. Net and Starting", """
                Cuối buổi đánh cầu lưới bằng động tác đẩy và cách cầm cơ bản khoảng 7/10 lần, giải thích và làm được bước tách cùng lunge.
                1. Mở đầu: bước tách để xuất phát và đánh lưới thuận, trái.
                2. Balance exercise: nhảy một chân theo các hướng, rồi trò hô Bắc, Nam, Đông, Tây để nhảy và giữ thăng bằng.
                3. Happy feet: quay lưng về phía giáo viên, chạy tại chỗ, khi có tín hiệu thì bật nhanh về hướng được chỉ, ví dụ góc lưới thuận.
                4. Chasse steps for net play: cặp cách nhau khoảng 3 mét. Tiến trình: chỉ đánh lưới, rồi thêm lunge, rồi chasse và lunge, rồi bước tách, chasse và lunge. Trái tay trước, thuận sau, rồi đổi luân phiên. 12 quả rồi đổi vai.
                5. Playing a net rally: sân nhỏ gần lưới, chỉ đánh cầu thấp, tính điểm.
                6. Cuối buổi: nhắc lại trọng tâm và giãn cơ.
                """),
            Unit("Buổi 5. Revision Games", """
                Cuối buổi làm được bước chasse, đổi cách cầm, đánh mạnh và đánh nhẹ.
                1. Mở đầu yêu cầu học viên làm lại những gì đã học ở ba buổi đầu. Cầu lông được nêu là chạy và đánh, xuất phát và dừng, đánh mạnh và nhẹ. Khuỷu cách xa thân, tay vợt đi về phía cầu.
                2. Tagging game: một người đuổi chạm các bạn. Người bị chạm chạy hai vòng ngoài sân rồi vào lại.
                3. Chasse game: người dẫn ném túi hoặc cầu, người đuổi bắt và trả, cách nhau khoảng 2 đến 3 mét.
                4. Chasse and hit, forehand: người cấp cầu ném về phía thuận, người đánh chasse rồi đánh bằng cầm cơ bản.
                5. Chasse and hit, backhand: lặp bài trên về phía trái.
                6. Group feed with choice: người cấp cầu chọn ném trái hoặc phải, người đánh chasse và dùng đúng cách cầm.
                7. Cuối buổi: nhắc lại trọng tâm và giãn cơ.
                """, "Ôn buổi 1, 2 và 3, gồm đổi cách cầm vợt."),
            Unit("Buổi 6. Revision Games", """
                Cuối buổi tham gia các trò chơi trước lưới và nêu được điểm giúp đánh lưới tốt.
                1. Mở đầu nhắc: cách cầm, tay chuyển động trước chân, bước tách, chasse, lunge, tay dài và đánh cầu xa thân.
                2. Statues: chạy tự do, khi có hiệu lệnh thì dừng, có thể tiến lên dừng ở thế lunge.
                3. Net king: hai người đánh lưới. Đánh vào lưới thì đối thủ được 1 điểm, chạm mép lưới được 3 điểm, tới 12 điểm thì thắng. Vợt giơ cao, luôn di chuyển bằng bước tách, chasse và lunge.
                4. Table tennis style net doubles: sân là khoảng từ lưới đến vạch giao. Bốn người đánh luân phiên, sau mỗi cú có thể chạy chạm vạch giao sân sau.
                5. Merry-go round: hai hàng đánh nối tiếp nhau ở khu trước lưới. Ai đánh hỏng, vào lưới hoặc ra ngoài thì mất điểm.
                6. Cuối buổi nhắc lại lưới, xuất phát và lunge.
                """, "Củng cố lối chơi trước lưới. Cuối buổi nhắc lại lưới, xuất phát và lunge."),
            Unit("Buổi 7. Serve and Rally", """
                Cuối buổi làm được giao cầu thấp trái tay và rally ở phần sân trước.
                1. Mở đầu: cầm ngón cái, giao trái tay, tư thế sẵn sàng, rally trước lưới. Giao từ tay, đánh dưới thắt lưng.
                2. Racket and shuttle relays: tiếp sức gắn với kỹ thuật đang học, ví dụ giữ cầu trên vợt bằng mặt thuận hoặc trái.
                3. Keep the shuttle up, thumb grip: giữ cầu bằng cầm ngón cái, mu bàn tay dẫn. Có thể cầm rất ngắn ở chữ T của vợt.
                4. Backhand short serve: giáo viên làm mẫu giao vào vùng mục tiêu, học viên đếm số quả vào mục tiêu và thử các cự ly.
                5. Backhand serve team competition: mỗi người ít nhất 10 quả, giao vào hộp. Đội xong sớm được thêm một điểm.
                6. Net singles: rally nửa sân, bắt đầu bằng giao thấp trái tay, sau giao chỉ chơi khu trước lưới.
                7. Cuối buổi: nhắc lại trọng tâm.
                """),
            Unit("Buổi 8. Backhand Lift", """
                Cuối buổi làm được lift trái tay từ trước lưới, đưa cầu cao và xa để có thời gian về giữa sân.
                1. Mở đầu: giải thích và làm bóng lift trái tay.
                2. Shuttle run team game: mỗi đội ba quả cầu trên sàn, chạy và lunge đặt cầu rồi người sau mang về.
                3. Dynamic balance: đứng một chân, đặt cầu thật xa phía trước rồi nhặt về mà không mất thăng bằng. Đổi chân.
                4. Backhand lift: tự đánh cầu càng cao càng tốt bằng trái tay, rồi cặp: một người ném chậm, người kia lift cao và xa, người ném chỉ được chạy sau khi cầu đã rời vợt. 12 quả rồi đổi.
                5. Backhand lift merry-go round: nhóm 4 đến 6 người từ giữa sân, lần lượt xuất phát, bước tách và lunge để lift. Cầu phải bay nhanh và cao tới vạch cuối.
                6. Cuối buổi: nhắc lại trọng tâm và giãn cơ.
                """),
            Unit("Buổi 9. Forehand Lift", """
                Cuối buổi làm được lift thuận từ trước lưới và giao cầu cao thuận tay. Giao cao dùng để bắt đầu rally đơn và đẩy đối thủ ra sân sau.
                1. Mở đầu: lift thuận, cầm V thuận, chuyển trọng tâm từ chân cầm vợt sang chân kia, xoay hông, vung dưới tay đủ tầm.
                2. Calf-touching: một người tấn công chạm bắp chân đối thủ, người phòng thủ phản ứng. Đổi vai sau khoảng 30 đến 40 giây.
                3. Balance the racket: hai người cách nhau 2 mét, dựng vợt, khi có tín hiệu thì bỏ vợt mình và chụp vợt của bạn trước khi vợt đổ.
                4. Forehand lift: tự đánh cầu cao bằng thuận tay, rồi cặp ném và lift, người ném chạy về vạch cuối chặn cầu. 12 quả rồi đổi.
                5. Forehand lift merry-go round: nhóm từ giữa sân, lift thuận bằng xuất phát, bước tách và lunge.
                6. The Golf Game: giao cao vào mục tiêu với càng ít cú càng tốt. Người mới có thể búng cầu khỏi tay. Dùng giao cao cho cú dài và giao thấp trái tay cho cú ngắn.
                7. Cuối buổi: nhắc lại trọng tâm.
                """),
            Unit("Buổi 10. Revision Games", """
                Cuối buổi đổi cầm khi lift từ lưới khoảng 7/10 lần, và lunge đủ tầm với mũi chân trước hướng điểm chạm cầu.
                1. Mở đầu nhấn lại điểm của buổi 8 và buổi 9, đúng cách cầm và đúng lunge. Học viên làm và nói sự khác nhau của hai kiểu lift.
                2. Dice run game: chạy khoảng 20 mét đi và về, tung xúc xắc cộng điểm, đội tới 100 điểm thì thắng.
                3. Balancing shuttles: đội cầu trên đầu và bước lunge. Nhấc gối, chạm gót trước, thân thẳng.
                4. Forehand and backhand lift merry-go round: từ giữa sân, chasse và lunge, lift thuận rồi về giữa, sau đó lift trái.
                5. Net shot and lift rally: rally trước lưới, khi có vị trí thì lift vào mục tiêu ở sân sau. Trúng mục tiêu được điểm, trượt bị trừ điểm. Rally kết thúc khi có người lift.
                6. Cuối buổi tóm tắt buổi 8, 9 và 10.
                """, "Nhắc lại buổi 8 và buổi 9. Cuối buổi tóm tắt buổi 8, 9 và 10."),
            Unit("Buổi 11. Midcourt Drives", """
                Cuối buổi cho thấy tư thế sẵn sàng, đánh drive thuận và trái đúng cách cầm, và có rally giữa sân ở mức cơ bản. Tư thế sẵn sàng: gối hơi khuỵu, người hơi đổ về trước, vợt trước thân, đầu vợt cao hơn bàn tay.
                1. Mở đầu làm mẫu drive thuận, drive trái và tư thế sẵn sàng. Học viên làm lại cách đổi cầm đã học.
                2. Throwing game.
                3. Keep the court free.
                4. Introducing racket speed.
                5. Flat play.
                6. Cuối buổi: nhắc lại trọng tâm.
                """, "Ôn cách đổi cầm vợt đã học ở các buổi trước."),
            Unit("Buổi 12. Midcourt Development", """
                Cuối buổi rally giữa sân với cách cầm đúng. Giáo án tiếp tục tư thế sẵn sàng và drive thuận, trái.
                1. Mở đầu.
                2. Throwing team game.
                3. Relay games, Run and throw.
                4. Midcourt game with body hits.
                5. How many shots per minute.
                6. Cuối buổi: nhắc lại trọng tâm.
                """),
            Unit("Buổi 13. Clear with Scissor Jump", """
                Cuối buổi làm bóng clear trên đầu kèm nhảy kéo, và giải thích cách tới sân sau để đánh clear thuận.
                1. Mở đầu.
                2. Scissor jump.
                3. Scissor jump practice.
                4. Forehand clear.
                5. Forehand clear rally.
                6. Cuối buổi: nhắc lại trọng tâm.
                """),
            Unit("Buổi 14. Development Games", """
                Cuối buổi làm bóng clear trên đầu kèm nhảy kéo, tới sân sau và đánh clear thuận.
                1. Mở đầu.
                2. Throwing game with scissor jump.
                3. Forehand clear rally with tricks.
                4. Forehand clear practice.
                5. Forehand clear game.
                6. Cuối buổi: nhắc lại trọng tâm.
                """),
            Unit("Buổi 15. Drop with Scissor Jump", """
                Cuối buổi giải thích drop trên đầu, làm động tác drop và so với clear. Cùng động tác ném như clear nhưng kết thúc bằng đẩy, không phải đánh hết lực. Điểm của buổi 13 và 14 vẫn dùng.
                1. Mở đầu: học viên nói sự khác nhau giữa các cú trên đầu.
                2. Mobility exercises.
                3. Scissor jump revision: làm bóng nhảy kéo, có và không có hai bước chasse lùi. Hạ bằng chân không cầm vợt rồi bước tới.
                4. Overhead dropshot.
                5. Lifts and drops: rally bắt đầu bằng lift cao, rồi drop thẳng. Một người lift, một người drop từ sân sau, rồi đổi.
                6. Cuối buổi: nhắc lại trọng tâm.
                """, "Các điểm của buổi 13 và 14 vẫn dùng. Buổi này có phần ôn nhảy kéo."),
            Unit("Buổi 16. Development Games", """
                Cuối buổi làm bóng drop trên đầu kèm nhảy kéo, tới sân sau và đánh drop thuận.
                1. Mở đầu.
                2. Shuttle chase.
                3. Plank exercises, core stability.
                4. Lift-drop-net.
                5. Lift, drop, net, variations.
                6. Half court singles with a no-go area.
                7. Cuối buổi: nhắc lại trọng tâm.
                """),
            Unit("Buổi 17. Smash and Block", """
                Cuối buổi giải thích và làm smash, giải thích và làm đòn phòng thủ. Cách chuẩn bị giống clear của buổi 13 và 14. Điểm chạm ở trước thân, động tác ném mạnh, cầu đi xuống, xoay khoảng 180 độ bằng nhảy kéo.
                1. Mở đầu.
                2. Mobility exercises.
                3. The Smash: làm bóng smash không cầu theo cặp và sửa cho nhau, rồi một người giao cao, người kia smash, người giao để cầu rơi rồi trả lại.
                4. Block defence, hai phần trong giáo án.
                5. Cuối buổi: nhắc lại trọng tâm.
                """, "Tư thế chuẩn bị smash dùng lại điểm clear của buổi 13 và 14."),
            Unit("Buổi 18. Development Games", """
                Cuối buổi làm được smash và đòn phòng thủ.
                1. Mở đầu.
                2. Group agility.
                3. Lift-smash-block.
                4. Half court singles with a winner smash.
                5. Cuối buổi: nhắc lại trọng tâm.
                """),
            Unit("Buổi 19. Singles Tactics", """
                Cuối buổi giải thích chiến thuật đánh đơn cơ bản.
                1. Mở đầu.
                2. Agility ladder 1.
                3. Half court singles with tactics 1.
                4. Half court singles with tactics 2.
                5. Half or full court singles, gộp chiến thuật 1 và 2.
                6. Cuối buổi: nhắc lại trọng tâm.
                """),
            Unit("Buổi 20. Tactical Games", """
                Cuối buổi nêu các cách ghi điểm khi đánh đơn.
                1. Mở đầu.
                2. Agility ladder 2.
                3. Half court team game.
                4. Team half court singles team game.
                5. Cuối buổi: nhắc lại trọng tâm.
                """),
            Unit("Buổi 21. Doubles Tactics", """
                Cuối buổi làm và giải thích đội hình tấn công và phòng thủ khi đánh đôi. Mở đầu nêu giao và đỡ giao, đội hình tấn công, đội hình phòng thủ, phối hợp đồng đội, và ôn các cú cơ bản của đánh đôi. Học viên làm lại giao trái tay và các cú chính.
                1. Revision of backhand serve: cặp giao thấp trái tay vào vòng hoặc mục tiêu trên sàn. Cầm thoải mái, đánh cầu từ tay. Khi giao đúng có thể thêm đỡ giao và đổi vai.
                2. Midcourt and frontcourt play.
                3. Positional play in doubles.
                4. Cuối buổi: nhắc lại trọng tâm.
                """, "Ôn các cú đánh cơ bản của đánh đôi và giao cầu trái tay."),
            Unit("Buổi 22. Tactical Games", """
                Cuối buổi dùng đội hình tấn công và phòng thủ trong tình huống trận.
                1. Mở đầu.
                2. The Stone Game.
                3. Mid-court game 1.
                4. Mid-court game 2.
                5. Doubles exercise and game.
                6. Cuối buổi ôn nguyên tắc của buổi 21 và buổi 22.
                """, "Ôn nguyên tắc của buổi 21 và buổi 22."),
        ]);

    private static Entry Swimming() => new(
        "Swim England Learn to Swim Framework, Stages 1–7",
        "https://www.swimming.org/learntoswim/swim-england-learn-to-swim-awards-1-7/",
        "Bảy giai đoạn Swim England, mỗi giai đoạn ghi đủ kết quả phải đạt. Đây là khung kỹ năng, không phải lịch tuần do trung tâm đặt.",
        [
            Unit("Stage 1", """
                Làm được khi có phao hoặc không phao:
                1. Vào nước và ra nước an toàn.
                2. Đi tới, đi lùi và đi ngang, mỗi hướng 5 mét.
                3. Rửa mặt.
                4. Chịu được nước đổ từ trên xuống.
                5. Nổi sấp rồi đứng dậy.
                6. Nổi ngửa rồi đứng dậy.
                7. Đẩy thành bể và trượt ở tư thế sấp.
                8. Đẩy thành bể và trượt ở tư thế ngửa.
                9. Nêu hai nội quy của hồ.
                """),
            Unit("Stage 2", """
                Làm được khi có phao hoặc không phao:
                1. Nhảy từ thành bể một cách an toàn.
                2. Thổi bong bóng ít nhất ba lần khi mũi và miệng ngập nước.
                3. Nổi rồi tự đứng, không cần người đỡ.
                4. Đẩy thành và trượt.
                5. Đi bằng chân 5 mét sấp, không phao.
                6. Đi bằng chân 5 mét ngửa, không phao.
                7. Xoay kiểu tuck giữa tư thế sấp và ngửa.
                8. Lăn người.
                9. Ra nước không cần người đỡ.
                """),
            Unit("Stage 3", """
                Làm được khi không dùng phao:
                1. Nhảy xuống và ngụp.
                2. Đẩy thành và giữ tư thế thuôn.
                3. Trượt rồi lăn sang tư thế kia.
                4. Bơi 5 mét sấp, xoay ngửa và bơi về.
                5. Nhặt đồ dưới nước.
                6. Nêu ba trong bốn thông điệp an toàn của giai đoạn.
                7. Trượt và đi 10 mét ngửa.
                8. Trượt và đi 10 mét sấp.
                9. Nổi tuck 3 giây.
                10. Ra nước không dùng bậc.
                """),
            Unit("Stage 4", """
                Làm được khi không dùng phao:
                1. Đổi ít nhất ba hình khi nổi.
                2. Đẩy thành theo hướng xuống đáy.
                3. Đạp chân 10 mét ngửa.
                4. Đạp chân 10 mét trườn sấp.
                5. Đạp chân 10 mét bướm.
                6. Đạp chân 10 mét ếch.
                7. Scull đầu đi trước 5 mét khi ngửa.
                8. Lăn liên tục từ ngửa sang sấp và từ sấp sang ngửa.
                9. Trượt rồi bơi 10 mét, được chọn một kiểu bơi.
                """),
            Unit("Stage 5", """
                1. Scull để đứng yên khi ngửa.
                2. Scull chân đi trước 5 mét.
                3. Scull cùng bạn trong 30 đến 45 giây và có xoay người.
                4. Giẫm nước 30 giây.
                5. Ba kiểu nhảy xuống nước sâu.
                6. Bơi 10 mét ngửa theo chuẩn giai đoạn.
                7. Bơi 10 mét trườn sấp theo chuẩn giai đoạn.
                8. Bơi 10 mét ếch theo chuẩn giai đoạn.
                9. Bơi 10 mét bướm theo chuẩn giai đoạn.
                10. Chống tay đứng 3 giây.
                11. Lộn trước.
                12. Làm một động tác gọi trợ giúp.
                """),
            Unit("Stage 6", """
                1. Nêu hai cách chuẩn bị trước khi tập.
                2. Đẩy thành từ tư thế nghiêng rồi vào bơi ngửa hoặc trườn sấp.
                3. Bơi 10 mét khi mặc quần áo.
                4. Mỗi kiểu bơi có nhịp thở theo chuẩn của giai đoạn.
                5. Bơi 25 mét một kiểu được chọn.
                6. Hô và ra tín hiệu cứu hộ.
                7. Lặn trên mặt nước.
                """),
            Unit("Stage 7", """
                1. Bơi 25 mét ngửa.
                2. Bơi 25 mét trườn sấp.
                3. Bơi 25 mét ếch.
                4. Bơi 25 mét bướm.
                5. Một phút liên kết scull, xoay và nổi trong nhóm từ ba người.
                6. Nhảy hoặc ngồi nhảy xuống nước.
                7. Bơi liên tục 50 mét một kiểu.
                8. Bơi 100 mét với ít nhất ba kiểu.
                9. Giẫm nước kiểu eggbeater 30 giây.
                10. Hoàn thành đường chướng ngại có ít nhất bốn vật, chân không chạm đáy.
                """),
        ]);

    private static Entry Volleyball() => new(
        "FIVB Coaches Manual, Table 1 và mục mẫu dạy người mới",
        "https://www.fivb.com/wp-content/uploads/2024/03/FIVB_Coach_Manual_EN.pdf",
        "Bảng ví dụ nửa năm của FIVB, kèm danh sách bài mẫu đúng chương người mới. Tập 2 ngày mỗi tuần, 2 giờ mỗi ngày, tổng 88 giờ trong 6 tháng. Tuần 21 và 22 được sách gộp một dòng.",
        [
            Unit("Tuần 1", """
                Chủ đề sách: một người chơi với bóng. Mục mẫu A ghi các việc:
                1. Dẫn bóng một tay, trái hoặc phải.
                2. Dẫn bóng hai tay khi đi tới, hoặc lăn bóng.
                3. Dẫn bóng hai tay khi đi lùi, hoặc lăn bóng.
                4. Dẫn bóng bằng bước ngang, hoặc lăn bóng.
                5. Dẫn bóng bằng bước chéo.
                6. Nhảy bắt bóng khi đi tới.
                7. Bắt bóng sau một nhịp nảy, ở tư thế ngồi xổm.
                8. Xoay bóng giữa hai chân hoặc quanh thân.
                9. Dẫn bóng một tay khi ngồi xổm và duỗi lần lượt từng chân.
                10. Di chuyển và quay với bóng kẹp giữa mắt cá hoặc đầu gối.
                11. Ngồi chữ V ở tư thế ngửa.
                12. Ưỡn lưng ở tư thế sấp, có bóng.
                13. Ném bóng ra sau hông hoặc sau lưng.
                14. Lăn ngang trong khi hai tay giữ bóng.
                15. Nhảy gập người, hai mắt cá kẹp bóng.
                16. Ném bóng về trước, chống đẩy rồi bắt bóng khi tiến.
                17. Nhảy đẩy bóng liên tiếp.
                18. Bắt bóng sau một nhịp nảy khi đang tiến.
                19. Bắt bóng sau một nhịp nảy kèm lăn.
                """),
            Unit("Tuần 2", """
                Chủ đề sách: hai người chơi với bóng. Mục mẫu B, khoảng cách ném bắt nêu 3 mét ở bài đầu:
                1. Bắt, gập bụng ngồi dậy rồi ném cho nhau.
                2. Bắt bóng khi đang nằm ngửa.
                3. Chuyền trước ngực khi đang ngồi.
                4. Chuyền trước ngực rồi quay người.
                5. Chuyền trước ngực ở tư thế chống đẩy.
                6. Chuyền trước ngực ở tư thế nằm sấp.
                7. Bắt rồi ném có xoay người.
                8. Nhảy, bắt và ném khi đang trên không.
                9. Gập lưng và nghiêng người về phía nhau.
                10. Xoay thân để chuyền.
                11. Xoay thân và ném cho bạn.
                12. Chuyền bóng qua giữa hai chân rồi qua trên đầu.
                13. Nhảy ngựa và bắt bóng sau một nhịp nảy.
                14. Nhảy ngựa và bắt bóng không để nảy.
                15. Nhảy và ném bóng ở tư thế gập người.
                """),
            Unit("Tuần 3", """
                Chủ đề sách: một người xử lý bóng dưới tay và một tay. Mục mẫu C, nhập môn chuyền dưới tay:
                1. Phối hợp hai tay và tư thế nền.
                2. Một nhịp nảy rồi bóng nằm trên hai tay.
                3. Đỡ liên tiếp sau một nhịp nảy.
                4. Đỡ liên tiếp không để nảy.
                5. Đỡ một đối một sau một nhịp nảy, kiểu quần vợt.
                6. Đỡ vào tường sau một nhịp nảy.
                7. Đỡ liên tiếp không nảy khi di chuyển trái phải.
                8. Đỡ liên tiếp không nảy khi đổi hướng.
                9. Chuyền dưới tay liên tiếp một đối một.
                10. Đỡ liên tiếp không nảy khi tiến.
                11. Đỡ liên tiếp không nảy khi sang trái hoặc sang phải.
                """),
            Unit("Tuần 4", """
                Chủ đề sách: chuyền dưới tay khi di chuyển nhiều hướng, và tư thế nền cho người sân sau.
                Sách tách hai tư thế: người hàng trước cho chắn nhanh, người hàng sau cho đỡ tấn công nhanh từ sân đối diện.
                Phần di chuyển của chuyền dưới tay trong mục mẫu C:
                1. Đỡ liên tiếp không nảy khi sang trái và phải.
                2. Đỡ liên tiếp không nảy khi đổi hướng.
                3. Đỡ liên tiếp không nảy khi tiến.
                4. Đỡ liên tiếp không nảy khi sang một bên.
                """),
            Unit("Tuần 5", """
                Chủ đề sách: giao dưới tay và đỡ giao. Mục mẫu D, giao dưới tay là một dạng chuyền một tay:
                1. Đỡ một tay sau một nhịp nảy, trái hoặc phải.
                2. Đỡ một tay luân phiên sau một nhịp nảy.
                3. Đỡ vào tường sau một nhịp nảy.
                4. Đỡ một đối một sau một nhịp nảy.
                5. Đỡ một tay không để nảy.
                6. Đỡ không nảy bằng tay trái, tay phải và cả hai tay.
                7. Đỡ không nảy bằng tay trái và tay phải khi bước ngang.
                8. Đỡ vào tường liên tiếp, không để nảy.
                9. Chuyền một tay cho nhau.
                10. Giao dưới tay vào tường.
                11. Giao qua lưới vào sân đối diện ở 3 mét, 5 mét, 7 mét, rồi từ sau vạch cuối.
                12. Trò kiểm soát giao, mỗi lượt 10 quả.
                """),
            Unit("Tuần 6", """
                Chủ đề sách: trò bắt, ném và chuyền có giao dưới tay. Mục mẫu F:
                1. Net ball: ném bóng qua lưới vào sân đối diện, mỗi đội chạm một hoặc hai lần rồi trả.
                2. Đỡ sau một nhịp nảy, sân rộng 4 đến 6 mét, lưới cao 2 mét, bắt đầu bằng cách ném bóng sang sân kia.
                3. Four squares: sân bốn ô, mỗi ô 4 đến 6 mét. Giao từ sau vạch giao sau một nhịp nảy, bằng một tay hoặc hai tay dưới. Trả bóng sau một nhịp nảy hoặc không nảy. Lưới hoặc dây cao 2 mét.
                4. Running pass: sau giao dưới tay, trả sang sân kia bằng chuyền trên tay hoặc dưới tay. Khi 2 đấu 2, một đội được chạm 2 hoặc 3 lần trước khi trả.
                5. Sequence volleyball: luật gần với trận thường, nhưng trả bóng bằng nhảy hoặc đập thì được 2 điểm.
                """),
            Unit("Tuần 7", """
                Chủ đề sách: bóng chuyền mini 2 đấu 2, 3 đấu 3 hoặc 4 đấu 4 bằng các mẫu đã học.
                Sách nói trận chỉ chơi được khi có hai việc: giao đúng vào sân đối diện mà không lỗi, và trả bóng giao đó về sân đối diện.
                Dùng các trò sân nhỏ và ít người ngay khi người học đã có chuyền và giao.
                """),
            Unit("Tuần 8", """
                Chủ đề sách: bắt, ném và xử lý bóng để vào chuyền trên tay. Phần đầu mục mẫu E:
                1. Vị trí hai tay và điểm chạm bóng.
                2. Dẫn bóng xuống sàn.
                3. Nhấc bóng từ sàn.
                4. Bắt và ném bằng một tay.
                5. Bắt sau một nhịp nảy ở tư thế trên tay.
                6. Bắt không để nảy rồi ném nhanh.
                """),
            Unit("Tuần 9", """
                Chủ đề sách: chuyền trên tay khi di chuyển nhiều hướng. Phần di chuyển của mục mẫu E:
                1. Bắt không nảy khi tiến.
                2. Bắt không nảy khi sang ngang.
                3. Bắt không nảy khi quay trái hoặc phải.
                4. Bắt không nảy ở tư thế ngồi xổm.
                5. Chuyền bước hai liên tiếp khi sang ngang.
                6. Chuyền bước hai liên tiếp khi quay 90 độ, 180 độ và 360 độ.
                7. Chuyền bước hai liên tiếp khi tiến.
                8. Ném về trước rồi nhảy chuyền.
                """),
            Unit("Tuần 10", """
                Chủ đề sách: trò chuyền trên tay, có chạy và bước ngang. Phần cuối mục mẫu E:
                1. Chuyền vào tường sau một nhịp nảy.
                2. Chuyền vào tường không để nảy.
                3. Chuyền một đối một sau một nhịp nảy, ở tư thế ngồi xổm.
                4. Chuyền một đối một khi đang ngồi.
                5. Chuyền một đối một có chạm sàn.
                6. Một lần chuyền rồi chuyền ngược.
                7. Một lần chuyền rồi chuyền tiếp.
                8. Chuyền ngang cho nhau.
                """),
            Unit("Tuần 11", """
                Chủ đề sách: chuyền bước hai từ sân sau lên lưới.
                Sách xếp chuyền và bước hai là một trong bảy mẫu cá nhân, sau tư thế và di chuyển.
                Bước hai từ sân sau là đưa bóng đã đỡ ở sân sau lên gần lưới cho người đập.
                """),
            Unit("Tuần 12", """
                Chủ đề sách: chuyền bước hai gần lưới, tập cho người chuyền hai.
                Người chuyền hai đứng gần lưới và đưa bóng cho người đập. Sách tách phần này khỏi bước hai từ sân sau của tuần trước.
                """),
            Unit("Tuần 13", """
                Chủ đề sách: trò chuyền và bước hai cho hai hoặc ba người.
                Nối chuyền với bước hai trong nhóm nhỏ trước khi vào đập.
                """),
            Unit("Tuần 14", """
                Chủ đề sách: tập đập, gồm vung tay, bước đà và giậm nhảy.
                Sách tách một cú đập thành bốn phần:
                1. Bước đà từ vị trí người đập.
                2. Giậm nhảy.
                3. Vung tay và hình đập.
                4. Tiếp đất rồi di chuyển vào vị trí cho tình huống sau.
                """),
            Unit("Tuần 15", """
                Chủ đề sách: đập bóng bằng nhảy và đẩy, đập nhanh qua lưới thấp, rồi trò chuyền, bước hai và đập.
                Tiến trình sách:
                1. Vung tay đập.
                2. Bước đà.
                3. Giậm nhảy.
                4. Nhảy và bắt bóng qua lưới.
                5. Nhảy và đánh bóng qua lưới.
                6. Đập nhẹ, kiểu tip.
                Thêm đập nhanh qua lưới thấp và trò nối chuyền, bước hai, đập.
                """),
            Unit("Tuần 16", """
                Chủ đề sách: đập bóng cao và đổi hướng đập.
                Ba bước sách để đổi hướng sau khi đã đập thẳng:
                1. Bước đà thẳng rồi đập dọc biên. Sau đó bước đà cong khoảng 60 độ từ ngoài đường biên và đập chéo sân.
                2. Bước đà thẳng, đập dọc biên, về vị trí cũ rồi vòng vào để đập chéo.
                3. Cùng một đường đà, định đập dọc biên rồi đổi bước lúc giậm để đập chéo.
                """),
            Unit("Tuần 17", """
                Chủ đề sách: đỡ đập khi di chuyển nhiều hướng.
                Sách nêu đỡ đập dùng mẫu chuyền dưới tay hoặc một tay. Các việc phải đưa vào:
                1. Vị trí và tư thế đỡ.
                2. Phán đoán.
                3. Tư thế phản ứng nhanh theo bóng.
                4. Phản xạ.
                5. Di chuyển nhanh đúng hướng trong vùng đỡ.
                6. Khéo léo khi lặp lại liên tiếp.
                Đường chân sách nêu: chạy tới bóng, chạy dưới bóng bằng bước ngồi xổm, bước ngang, bước chéo, lao tới, bước lùi, rồi dừng và phản ứng khi bóng ở gần.
                """),
            Unit("Tuần 18", """
                Chủ đề sách: đỡ đập có phán đoán trước.
                Trong tiến trình đỡ đập, sách đặt khả năng đoán thời điểm và hướng ngay sau tư thế đỡ.
                Người đỡ đọc bước đà và hướng vung tay của người đập trước khi bóng qua lưới, rồi chọn hướng di chuyển.
                """),
            Unit("Tuần 19", """
                Chủ đề sách: hai hoặc ba người đỡ đập, và hiểu đội hình đỡ.
                Sách có mục hướng di chuyển khi đỡ bằng một, hai và ba người. Không phải cả hàng cùng đổ về một phía. Vị trí và hướng của từng người phải khớp với đường bóng đập.
                """),
            Unit("Tuần 20", """
                Chủ đề sách: tập nối đỡ bóng, chuyền bước hai và đập.
                Nối ba mẫu đã học: đỡ, bước hai, đập. Sách nói khi đã thuộc từng mẫu thì mới vào tập phức hợp và đội hình.
                """),
            Unit("Tuần 21 và 22", """
                Sách gộp hai tuần này thành một dòng: thi đấu 4 đấu 4 trên sân 6 x 4,5 mét.
                Dùng giao dưới tay, đỡ giao, chuyền bước hai và đập.
                Toàn kế hoạch: 2 ngày mỗi tuần, 2 giờ mỗi ngày, tổng 88 giờ trong 6 tháng.
                """),
        ]);

    private static Entry Basketball() => new(
        "FIBA Mini Basketball Coaches Manual, mục 4.1 đến 4.6",
        "https://assets.fiba.basketball/image/upload/documents-corporate-mini-basketball-mini-basketball-coaches-manual-eng.pdf",
        "Thứ tự chương kỹ thuật trong sách FIBA. Không phải lịch tuần. Với trẻ nhỏ, sách yêu cầu chơi trước khi khoan cứng, và khi tập ném thì đứng gần rổ.",
        [
            Unit("Mục 4.1 Dribbling", """
                Sách bắt đầu mục dẫn bóng từ trò số 11:
                11. Dẫn tự do. Khi có tín hiệu thì dừng, xoay người về rổ, đường biên hoặc vạch cuối. Huấn luyện viên chỉ chân trụ và xoay trước hoặc xoay ngược.
                12. Dog and Hare: đội chó xuất phát ở vòng giữa, đội thỏ ở bất kỳ đâu. Chó dẫn bóng và chạm thỏ. Ai bị chạm thì ngồi xuống.
                13. Four Corners: bốn người ở bốn góc, một người ở giữa. Khi có lệnh, người ở góc dẫn bóng sang góc kế. Người giữa tranh một góc. Ai đến trước thì giữ góc, người thua ra giữa.
                14. Fisherman: người câu đứng giữa sân, đàn cá dẫn bóng từ vạch cuối sang vạch đối diện. Ai bị chạm thì thành người câu.
                15. Biến thể của trò góc: người giữa chạm người đang chạy. Người bị chạm đứng yên cho đến khi một người khác chạm họ, rồi cả hai dẫn bóng tới góc. Sách nói hợp với nhóm từ 9 người.
                16. Wolf and Sheep: sói ở vòng giữa, cừu trong vùng cấm địa, ai cũng có bóng. Khi chưa có lệnh, cừu dẫn bóng tự do và sói chưa được chạm. Khi có lệnh, sói chạm cừu đang ở ngoài vùng cấm. Cừu bị chạm thành sói.
                17. 1-2-3 Stop: một người đứng giữa sân quay lưng và hô. Những người kia dẫn bóng từ vạch cuối. Khi nghe dừng, ai còn di chuyển thì về lại vạch. Người tới giữa sân mà không bị thấy là người thắng.
                18. Signal: đứng thành hàng, dẫn bóng theo hướng huấn luyện viên chỉ.
                19. Relay dribbling: tiếp sức tiến, hoặc tiến rồi lùi, một bóng mỗi người hoặc một bóng mỗi đội. Về tới hàng thì chạm bóng của người sau.
                20. Relay with pins: vừa dẫn một tay vừa hạ chai trên đường đi, người sau dựng lại chai.
                21. Dẫn theo chu vi sân và đổi hướng, tốc độ, tay theo lệnh.
                22. Khi gặp bạn thì đổi bóng mà không nhặt bóng lên, chỉ tiếp tục dẫn bóng của bạn. Có thể tiến lên hai bóng.
                23. Balance ball: giữ một bóng và đặt bóng thứ hai lên trên, rồi đổi tay để đỡ bóng đang rơi.
                24. Nhóm 3 đến 5 người. Tại mỗi mốc thì làm một kỹ năng được chỉ: đổi tay, dẫn lùi, đổi tốc độ, dừng nhảy, dẫn lùi rồi đổi tay và đi tiếp, hoặc đổi hướng.
                """),
            Unit("Mục 4.2 Shooting", """
                Sách nói với người chơi mini-basketball, chưa cần ép một kiểu ném. Trọng tâm là dừng và giữ thăng bằng trước khi ném. Mục tiêu có thể là lưới, vành hoặc bảng. Hạ rổ nếu được, dùng bóng cỡ 5 hoặc cỡ 3. Ném gần rổ, trong vùng cấm, khi chưa đủ sức ném xa. Mục tiêu nên cao hơn người ném.
                1. Ném các loại bóng khác nhau vào thùng, vòng hoặc rổ ở các độ cao và khoảng cách.
                2. Ném tự do vào rổ. Với trẻ, chạm vành, lưới hoặc bảng cũng có thể tính là ghi điểm.
                3. Ném vào điểm trên tường, số vẽ trên tường, vòng trên sàn, hoặc vòng bạn cầm.
                4. Ném để hạ chai, trúng bóng khác hoặc trúng vật đứng yên và vật di chuyển.
                5. Ném vào rổ lớn hơn bình thường nếu có.
                6. Thi đấu: vào rổ 2 điểm, chạm vành 1 điểm, chạm bảng nửa điểm.
                7. Shooting competition: ném tự do trước rổ, đội nào nhiều lần vào hơn trong thời gian cho trước thì thắng. Đổi khoảng cách, đổi bên và có hoặc không dùng bảng.
                8. Thi ném phạt, cá nhân hoặc theo đội.
                9. Crocodile: ném trúng thì về hàng. Ném trượt thì đứng ở vạch cuối. Một cú trúng cứu một người ở vạch cuối. Nếu cả đội xuống vạch cuối thì cá sấu thắng.
                10. 21: mỗi đội hai bóng. Ném trúng từ điểm chỉ định được 2 điểm. Bắt bóng rebound không để nảy thì được ném lần hai, giá trị 1 điểm. Đội nào tới ít nhất 21 trước thì thắng.
                11. Around the World: 6 đến 10 điểm ném. Vào thì sang điểm sau. Trượt thì người sau ném. Có thể cho ba lần ở mỗi điểm rồi vẫn được đi tiếp.
                12. Ném khi nhắm một mắt.
                13. Đứng quay lưng, khi có lệnh thì xoay trước hoặc xoay ngược rồi ném.
                14. Bóng đặt dưới đất, khi có lệnh thì nhặt và ném.
                15. Cầm bóng sau lưng, bật bóng qua giữa hai chân ra trước, bắt rồi ném.
                16. Hai người cùng cầm một bóng gần rổ. Khi có lệnh thì tranh bóng, người giữ được bóng thì ném, người kia không kèm cú ném.
                17. Kẹp bóng giữa hai mắt cá, nhảy, bắt lại rồi ném. Lúc đầu được một nhịp nảy.
                18. Một người ném bóng vào bảng, bạn nhảy rebound, tiếp đất rồi ném.
                """),
            Unit("Mục 4.3 Dribbling and shooting", """
                1. All Together to the Basket: hai đội, mỗi người một bóng, đứng lưng đối lưng ở giữa sân. Khi có lệnh thì dẫn về rổ đang đối mặt và ném. Trượt thì được ném thêm hai lần. Có thể xuất phát từ ngồi, quỳ hoặc nằm, và có thể xoay trước khi dẫn.
                2. Dribbling and shooting relay: dẫn bóng, dừng, ném. Vào rổ thì về hàng. Trượt thì còn hai lần nữa. Đội nào vào nhiều hơn trong thời gian cho trước thì thắng.
                3. Cùng tiếp sức nhưng mỗi người chỉ một cú ném. Người sau xuất phát khi người trước đã ném.
                4. Dribble slalom: dẫn quanh nón từ giữa sân rồi ném. Đội nào vào nhiều hơn, hoặc tới số điểm định trước, thì thắng.
                5. Slalom cả sân.
                6. Parallel relay: ba hoặc bốn đội từ vạch cuối. Người đầu dẫn sang rổ đối diện, dừng và ném, được ba lần, rồi rebound và vỗ tay người sau. Cú ném có thể là dừng nhảy, lay-up hoặc lay-up khi đang chạy. Nhóm phải nhỏ để ít người đứng chờ.
                """),
            Unit("Mục 4.4 Passing", """
                Sách nêu ba cản trở khi trẻ chuyền: không nhìn đồng đội, chưa ném đủ xa, và chưa chuyền qua người phòng thủ vì xoay thân mà không xoay chân. Cách tập: thu hẹp sân, bên tấn công đông hơn bên phòng thủ, cấm dẫn bóng hoặc chỉ được dẫn sau một số đường chuyền, người phòng thủ được cắt chuyền nhưng chưa được cướp bóng trên tay.
                1. Từng cặp đổi bóng khi đứng, quỳ, ngồi hoặc nằm sấp. Rồi vòng bóng hình số 8 quanh chân trước khi đổi.
                2. Paris passing: người không bóng bước ra một hoặc hai bước rồi cắt vào nhận chuyền. Bắt thì dừng, xoay mặt về rổ, rồi xoay lại để chuyền trả. Dừng có thể là dừng nhảy hoặc dừng hai nhịp.
                3. Nhóm tối đa 5 người. Đếm số đường chuyền trong một khoảng thời gian. Không được chuyền trả ngay cho người vừa chuyền cho mình.
                4. Hai người chạy quanh một vòng và chuyền. Khi có lệnh thì chạy ngược chiều.
                5. Lăn bóng qua giữa chân cả hàng, người cuối dẫn bóng lên đầu hàng. Hoặc đưa bóng sang ngang cho người sau, đứng hoặc ngồi.
                6. Pepper: một người ở giữa vòng, nhận bóng từ ngoài và chuyền cho người kế tiếp. Đội nào chuyền hết vòng nhanh hơn thì thắng.
                7. Pepper hai bóng.
                8. Star: nhóm 5 người, chuyền theo hình đã định. Đội nào chuyền nhiều hơn trong thời gian cho trước thì thắng.
                9. Star lay-up: người chuyền chạy theo bóng và đứng sau người nhận. Một người dẫn vào lay-up, người khác rebound.
                10. Double star: hai đội chuyền cùng lúc, mỗi đội một bóng.
                11. Square: bốn người chuyền thật nhanh, khi có lệnh thì đổi chiều. Có thể chạy theo đường chuyền sang góc kế.
                12. Square hai bóng, hai bóng đi ngược chiều, khi có lệnh thì cả hai đổi chiều.
                13. Hai hàng vừa chạy vừa chuyền đến cuối sân. Người ngoài có thể ném rổ, tự rebound, rồi đổi bên.
                14. Weave ba nhóm: người giữa chuyền sang một bên, chạy vòng sau người đó và cắt lên trước. Cứ bắt bóng thì chuyền sang phía đối diện rồi chạy sau người nhận. Có thể kết thúc bằng một cú ném.
                15. Weave bốn hoặc năm nhóm. Đường chuyền đầu phải tới người gần nhất ở phía có hai người. Các đường sau luôn tới người gần nhất.
                """),
            Unit("Mục 4.5 Dribbling, passing and shooting", """
                Sách muốn kỹ năng đơn được nối vào tình huống đang di chuyển.
                1. Trong một vùng sân, một số người dẫn bóng và không ai được đứng yên. Khi có còi, người có bóng chuyền cho người khác, người nhận bắt đầu dẫn.
                2. Một người đứng dạng chân và dang tay. Bạn cách 3 đến 4 mét dẫn bóng luồn dưới tay, vòng quanh, về điểm cũ, dừng, xoay trước và xoay ngược, rồi chuyền. Người kia lặp lại.
                3. Dẫn bóng, dừng nhảy trước bạn cách 3 đến 4 mét, chuyền trao tay với một tay trên và một tay dưới bóng. Người nhận dẫn đi, người kia lùi về điểm xuất phát.
                4. Một người dẫn hai bóng, khi có lệnh thì chuyền cả hai cho bạn. Đi bộ rồi chạy.
                5. Tiếp sức: dẫn tới điểm định, dừng nhảy, xoay, chuyền về hàng. Rồi chuyền khi đang chạy, và chuyền cho đồng đội cũng đang chạy.
                6. Corner passing: bốn góc của nửa sân, mỗi góc một bóng. Người đầu dẫn tới nửa vòng tròn, dừng, quay, chuyền cho người sau và chạy về.
                7. Biến thể: không chuyền về hàng mình mà chuyền sang hàng kế và chạy sang hàng đó. Xoay trái hoặc phải, chuyền tay trái hoặc tay phải.
                8. Pair shooting: một người ném, một người rebound và chuyền ra. Mỗi người ba cú rồi đổi. Cặp nào tới số điểm định trước thì thắng.
                9. Hai hàng sau vạch cuối. Một người lăn bóng, người kia chạy lấy, chuyền cho người đã vào sân và chơi give and go, từ phải và từ trái, bằng tay phải và tay trái.
                10. Nối nhiều kiểu dẫn, chuyền và ném. Dẫn sang đầu kia, làm các động tác dẫn trên đường, rồi lay-up. Khi một người qua giữa sân thì người sau được xuất phát. Có thể đặt người đội kia đứng yên trên sân để dẫn bóng vượt qua, họ được gạt bóng nhưng không được di chuyển.
                """),
            Unit("Mục 4.6 Adding defence", """
                Sách chuyển các trò ở trên thành có tranh chấp: một bên tấn công, một bên phòng thủ. Người có bóng phải bảo vệ bóng bằng cách di chuyển bóng hoặc xoay chân. Người mới thường xoay thân mà không xoay chân.
                Khi kèm người có bóng, không chỉ với tay cướp bóng. Với tay dễ phạm lỗi hoặc mất thăng bằng. Giữ vị trí để người cầm bóng không tới chỗ họ muốn cũng là phòng thủ.
                Khi kèm người không có bóng, nhiệm vụ là không để người đó nhận bóng, không phải lao vào giật bóng.
                Với lứa tuổi này, sách không dạy bước ngang để chịu lỗi charge. Chỉ cần đứng trước đối thủ đang có bóng, hoặc đứng giữa đối thủ và người đang giữ bóng.
                Trò có tính đua thường vui hơn. Thêm tranh chấp khiến kỹ năng được làm nhanh hơn và dễ mang vào trận.
                """),
        ]);

    private static Entry Chess() => new(
        "FIDE Early Years Skills",
        "https://eys.fide.com/en/l1a1.php",
        "Khóa 15 chương của FIDE cho trẻ khoảng 5 đến 8 tuổi, trên bàn cờ khổng lồ. Mỗi chương khoảng một giờ rưỡi. Giáo viên chia hoạt động cho vừa giờ học. Tên hoạt động giữ đúng trang FIDE.",
        [
            Unit("Chương 1. Exploring the chessboard space", """
                Khám phá mặt bàn cờ: trong và ngoài bàn, ô đen và ô trắng.
                1. The Castle Step.
                2. A Hop and Clap.
                3. The Castle’s Great Ball.
                """),
            Unit("Chương 2. Forward vertical, backward vertical", """
                Đi tới và lùi theo cột.
                1. The Path that Must be Taken.
                2. Passing Meetings.
                3. Close Encounters.
                4. Meet and Greet.
                5. Flower Power.
                """),
            Unit("Chương 3. Horizontal and vertical", """
                Đi ngang và đi dọc.
                1. The Letters F and B.
                2. Hey This is Getting Harder.
                3. Boletus the Gnome.
                """),
            Unit("Chương 4. The diagonal", """
                Đường chéo.
                1. The Blind Person.
                2. A New Possibility: The Diagonal.
                3. The Carriages Arrive at the Castle.
                """),
            Unit("Chương 5. The movements", """
                Ghép các hướng đã học.
                1. The Carriages Cross the Castle.
                2. How Many Steps Must I Make.
                3. Finding Your Way.
                4. Juggler of the Year.
                """),
            Unit("Chương 6. Capturing", """
                Ăn quân.
                1. Colourful Directions.
                2. Don’t Get Captured.
                3. Don’t Get Captured by Rospo the Toad.
                """),
            Unit("Chương 7. Discovering the coordinates", """
                Đọc tọa độ.
                1. Reading the Coordinates Using Pieces of Cord.
                2. Room Race.
                """),
            Unit("Chương 8. The coordinates 2", """
                Tiếp tục tọa độ.
                1. Find the Room Win a Prize.
                """),
            Unit("Chương 9. The coordinates 3", """
                Tọa độ bằng cơ thể và chữ.
                1. Body Letters and Numbers.
                2. Mr Letter.
                3. Holding Hands.
                4. Find the Room.
                """),
            Unit("Chương 10. Chess: the legend - the king", """
                Quân vua.
                1. Chess: the Legend.
                2. The Dance of the Armies.
                3. Find the House.
                4. The King When Kings Meet.
                5. Prize Kings.
                """),
            Unit("Chương 11. Rock the rook", """
                Quân xe.
                1. Rock’s Relatives.
                2. Rook Relay Race.
                3. Rampaging Rock.
                """),
            Unit("Chương 12. Diago the bishop", """
                Quân tượng.
                1. Diago’s Movements.
                2. Don’t Get Captured.
                3. Diago Captures Diago.
                4. Diago Hugs Diago.
                """),
            Unit("Chương 13. Regina the queen", """
                Quân hậu.
                1. Regina Down Every Path.
                2. How Many Can Regina Capture.
                3. Regina Has 3 Paths.
                """),
            Unit("Chương 14. Pod the pawn", """
                Quân tốt.
                1. Let’s Count Pod’s.
                2. The War of the Pawns.
                3. Become Who You Want.
                """),
            Unit("Chương 15. Skip the knight", """
                Quân mã.
                1. Skip’s Paths.
                2. Obstacle Course.
                3. Jumping in Pairs.
                4. With Lots of Skip’s Who’ll Get Captured First.
                """),
        ]);

    private static Entry Tennis() => new(
        "ITF Tennis Play and Stay, Tennis10s",
        "https://www.itftennis.com/en/growing-the-game/itf-tennis-play-and-stay/",
        "ITF công bố ba giai đoạn bóng chậm, không công bố giáo án từng buổi. Luật từ 2012 yêu cầu thi đấu 10 tuổi trở xuống dùng đúng loại bóng và đúng cỡ sân.",
        [
            Unit("Red, Stage 3", """
                Giai đoạn bóng chậm nhất trong ba giai đoạn Tennis10s.
                1. Tốc độ: chậm hơn bóng vàng khoảng 75 phần trăm.
                2. Bóng: bóng xốp đường kính 8 đến 9 cm, hoặc bóng nỉ đường kính 7 đến 8 cm.
                3. Sân: dài 10,97 đến 12,8 mét, rộng 4,88 đến 6,1 mét.
                4. Lưới ở giữa: cao 0,80 đến 0,838 mét.
                5. Cách tính ITF nêu: một tie-break tới 7, một tie-break tới 10, ba tie-break tới 7, hoặc một set ngắn tới 4.
                """),
            Unit("Orange, Stage 2", """
                Giai đoạn giữa của Tennis10s.
                1. Tốc độ: chậm hơn bóng vàng khoảng 50 phần trăm.
                2. Bóng: bóng nỉ đường kính 6 đến 6,86 cm.
                3. Sân: dài 17,98 đến 18,29 mét, rộng 6,4 đến 8,3 mét.
                4. Lưới ở giữa: cao 0,80 đến 0,914 mét.
                5. Cách tính ITF nêu: ba tie-break tới 7, hoặc một set ngắn tới 4.
                """),
            Unit("Green, Stage 1", """
                Giai đoạn gần bóng vàng nhất trong Tennis10s.
                1. Tốc độ: chậm hơn bóng vàng khoảng 25 phần trăm.
                2. Bóng: bóng nỉ đường kính 6,3 đến 6,86 cm.
                3. Sân: 23,77 x 8,23 mét, là cỡ sân tiêu chuẩn.
                4. Lưới ở giữa: cao 0,914 mét.
                5. Cách tính ITF nêu: ba tie-break tới 7, hoặc set ngắn tới 4 với set thứ ba là tie-break tới 10.
                """),
        ]);
}
