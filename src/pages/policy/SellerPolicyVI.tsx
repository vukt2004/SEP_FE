type PolicyClause = {
  id: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  steps?: string[];
};

type PolicySection = {
  id: string;
  title: string;
  clauses: PolicyClause[];
};

const highlights = [
  {
    title: "Chia doanh thu",
    value: "90% Creator",
    description: "Doanh thu giao dịch hợp lệ chia 90% cho creator và 10% cho nền tảng.",
  },
  {
    title: "Thời gian duyệt",
    value: "24-72 giờ",
    description: "Thời gian duyệt nội dung tiêu chuẩn sau khi gửi review.",
  },
  {
    title: "Giữ doanh thu",
    value: "7-14 ngày",
    description: "Doanh thu được giữ ở trạng thái Pending trước khi chuyển Available.",
  },
  {
    title: "Mức xử lý",
    value: "4 cấp độ",
    description: "Warning, Restriction, Suspension và Ban theo mức độ vi phạm.",
  },
];

const policySections: PolicySection[] = [
  {
    id: "1",
    title: "Điều kiện tham gia và yêu cầu tài khoản",
    clauses: [
      {
        id: "1.1",
        title: "Điều kiện trở thành Creator",
        bullets: [
          "Người dùng phải có tài khoản hợp lệ trên nền tảng.",
          "Cần hoàn tất các bước xác minh cần thiết khi hệ thống yêu cầu.",
          "Không ở trạng thái tạm khóa, hạn chế chức năng, hoặc đang bị điều tra vi phạm.",
          "Phải đồng ý Creator Terms of Service và các chính sách liên quan đến nội dung, giao dịch.",
        ],
      },
      {
        id: "1.2",
        title: "Kích hoạt quyền Creator",
        bullets: [
          "Người dùng có thể cần nâng cấp role hoặc gói creator để mở quyền.",
          "Có thể cần hoàn tất hồ sơ creator trước khi hoạt động.",
          "Sau khi kích hoạt, creator có thể tạo, gửi duyệt và bán game.",
        ],
      },
      {
        id: "1.3",
        title: "Trách nhiệm của Creator",
        bullets: [
          "Creator chịu trách nhiệm về nội dung đã đăng tải.",
          "Creator chịu trách nhiệm về tính chính xác của mô tả và kỳ vọng người chơi.",
          "Creator phải đảm bảo nội dung hợp pháp, đúng policy và không gây hại cho hệ thống hoặc người dùng.",
        ],
      },
      {
        id: "1.4",
        title: "Bảo mật tài khoản",
        bullets: [
          "Creator phải bảo mật thông tin đăng nhập và quyền truy cập tài khoản.",
          "Không chia sẻ tài khoản cho người khác.",
          "Không cho bên thứ ba sử dụng tài khoản để đăng nội dung.",
        ],
      },
      {
        id: "1.5",
        title: "Sử dụng nhiều tài khoản",
        bullets: [
          "Không được tạo nhiều tài khoản để gian lận doanh thu hoặc lách chính sách.",
          "Không được tự mua nội dung của mình qua tài khoản liên quan.",
          "Nền tảng có thể gộp, hạn chế, khóa tài khoản liên quan và thu hồi doanh thu gian lận.",
        ],
      },
      {
        id: "1.6",
        title: "Thay đổi trạng thái tài khoản",
        bullets: [
          "Nền tảng có thể thay đổi trạng thái creator khi có vi phạm, dấu hiệu gian lận hoặc khiếu nại nghiêm trọng.",
          "Trạng thái gồm Active, Restricted, Suspended, và Banned.",
        ],
      },
      {
        id: "1.7",
        title: "Chấm dứt quyền Creator",
        bullets: [
          "Quyền creator có thể chấm dứt do creator yêu cầu, vi phạm nghiêm trọng lặp lại, hoặc quyết định từ nền tảng.",
          "Hậu quả có thể gồm ngừng hiển thị nội dung, ngừng bán và xử lý phần doanh thu còn lại theo policy.",
        ],
      },
    ],
  },
  {
    id: "2",
    title: "Chính sách đăng nội dung",
    clauses: [
      {
        id: "2.1",
        title: "Quyền sở hữu và quyền sử dụng nội dung",
        bullets: [
          "Creator phải là chủ sở hữu nội dung hoặc có quyền sử dụng hợp pháp.",
          "Nội dung không được vi phạm bản quyền hoặc quyền sở hữu trí tuệ bên thứ ba.",
          "Khi đăng tải, creator cấp quyền không độc quyền cho nền tảng để lưu trữ, phân phối và hiển thị nội dung.",
        ],
      },
      {
        id: "2.2",
        title: "Yêu cầu về chất lượng nội dung",
        bullets: [
          "Game phải có đáp án (phải có lời giải).",
          "Không có lỗi nghiêm trọng như soft lock, crash, hoặc lỗi logic.",
          "Phải có các thành phần cơ bản gồm Start, Goal, và luồng gameplay hợp lý.",
          "Nội dung không đạt tiêu chí có thể bị từ chối hoặc gỡ bỏ.",
        ],
      },
      {
        id: "2.3",
        title: "Yêu cầu về tính chính xác",
        bullets: [
          "Creator phải cung cấp chính xác tên, mô tả gameplay, độ khó và cơ chế đặc biệt.",
          "Nghiêm cấm thông tin sai lệch hoặc che giấu yếu tố gameplay quan trọng.",
        ],
      },
      {
        id: "2.4",
        title: "Nội dung bị cấm",
        bullets: [
          "Nội dung vi phạm pháp luật là bị cấm.",
          "Nội dung độc hại, phản cảm, không phù hợp, spam hoặc chất lượng thấp là bị cấm.",
          "Nội dung gây ảnh hưởng tiêu cực đến hệ thống hoặc người dùng khác là bị cấm.",
          "Nền tảng có quyền từ chối hoặc gỡ nội dung vi phạm không cần báo trước.",
        ],
      },
      {
        id: "2.5",
        title: "Định dạng và dữ liệu nội dung",
        bullets: [
          "Nội dung phải tuân thủ định dạng kỹ thuật của nền tảng.",
          "Creator chịu trách nhiệm đảm bảo file hợp lệ và dữ liệu an toàn cho hệ thống.",
        ],
      },
      {
        id: "2.6",
        title: "Trạng thái nội dung",
        bullets: [
          "Các trạng thái nội dung gồm Draft, Pending, Approved và Rejected.",
          "Creator có trách nhiệm theo dõi trạng thái và cập nhật khi cần.",
        ],
      },
      {
        id: "2.7",
        title: "Chỉnh sửa nội dung",
        bullets: [
          "Creator có thể chỉnh sửa trước khi publish hoặc sau khi bị từ chối.",
          "Nội dung đã publish khi chỉnh sửa có thể cần duyệt lại.",
        ],
      },
      {
        id: "2.8",
        title: "Gỡ bỏ nội dung",
        bullets: [
          "Nền tảng có quyền gỡ nội dung do vi phạm policy, lỗi nghiêm trọng, hoặc khiếu nại hợp lệ.",
          "Việc gỡ có thể tạm thời hoặc vĩnh viễn, và có thể không cần báo trước với trường hợp nghiêm trọng.",
        ],
      },
      {
        id: "2.9",
        title: "Trách nhiệm sau khi publish",
        bullets: [
          "Creator phải theo dõi phản hồi và sửa lỗi sau khi publish.",
          "Nếu không duy trì chất lượng, nội dung có thể bị hạ trạng thái, gỡ khỏi hệ thống hoặc ảnh hưởng doanh thu.",
        ],
      },
    ],
  },
  {
    id: "3",
    title: "Chính sách duyệt và kiểm duyệt",
    clauses: [
      {
        id: "3.1",
        title: "Yêu cầu duyệt nội dung",
        bullets: [
          "Tất cả nội dung creator gửi lên phải qua kiểm duyệt trước khi publish.",
          "Chỉ nội dung Approved và đáp ứng tiêu chí chất lượng, chính sách mới được hiển thị và bán.",
        ],
      },
      {
        id: "3.2",
        title: "Quy trình duyệt",
        steps: [
          "Creator gửi nội dung để duyệt.",
          "Nội dung chuyển sang trạng thái Pending.",
          "Admin hoặc moderator kiểm tra tính hợp lệ, tính hoàn chỉnh và trải nghiệm người chơi.",
          "Kết quả duyệt được ghi nhận và phản hồi cho creator.",
        ],
      },
      {
        id: "3.3",
        title: "Kết quả duyệt",
        bullets: [
          "Approved: nội dung đạt yêu cầu và có thể publish.",
          "Rejected: nội dung không đạt và cần chỉnh sửa trước khi gửi lại.",
          "Needs Revision: nội dung gần đạt nhưng cần cập nhật nhỏ trước khi duyệt lại.",
        ],
      },
      {
        id: "3.4",
        title: "Tiêu chí kiểm duyệt",
        bullets: [
          "Nội dung có thể hoàn thành và không có lỗi nghiêm trọng.",
          "Gameplay rõ ràng, hợp lý và đúng với mô tả.",
          "Không gây hiểu nhầm cho người chơi và không vi phạm policy.",
          "Nền tảng có thể điều chỉnh tiêu chí theo từng thời điểm.",
        ],
      },
      {
        id: "3.5",
        title: "Thời gian xử lý",
        bullets: [
          "Thời gian duyệt thông thường là 24 đến 72 giờ.",
          "Các trường hợp phức tạp hoặc khối lượng lớn có thể kéo dài hơn.",
        ],
      },
      {
        id: "3.6",
        title: "Quyền của nền tảng",
        bullets: [
          "Nền tảng có quyền từ chối nội dung không đáp ứng tiêu chí.",
          "Nền tảng có thể yêu cầu chỉnh sửa trước khi phê duyệt.",
          "Nền tảng có thể tạm dừng hoặc hủy quá trình duyệt khi phát hiện vi phạm.",
        ],
      },
      {
        id: "3.7",
        title: "Kiểm duyệt sau khi publish",
        bullets: [
          "Nội dung đã publish vẫn có thể bị kiểm tra lại khi phát sinh lỗi mới, vi phạm policy, hoặc khiếu nại người dùng.",
          "Nền tảng có thể gỡ nội dung hoặc tạm ngưng bán sau khi re-review.",
        ],
      },
      {
        id: "3.8",
        title: "Khiếu nại và phản hồi",
        bullets: [
          "Creator có thể yêu cầu xem xét lại khi không đồng ý kết quả duyệt.",
          "Nền tảng có thể giữ nguyên hoặc điều chỉnh quyết định ban đầu.",
        ],
      },
      {
        id: "3.9",
        title: "Quyết định cuối cùng",
        bullets: [
          "Mọi quyết định kiểm duyệt thuộc quyền của nền tảng.",
          "Quyết định dựa trên chính sách hiện hành, trạng thái nội dung thực tế và mức ảnh hưởng hệ thống.",
        ],
      },
    ],
  },
  {
    id: "4",
    title: "Chính sách đặt giá",
    clauses: [
      {
        id: "4.1",
        title: "Quyền đặt giá",
        bullets: [
          "Creator có quyền tự đặt giá bằng Orbit Coin.",
          "Giá áp dụng khi nội dung đã được duyệt và publish.",
        ],
      },
      {
        id: "4.2",
        title: "Giới hạn giá",
        bullets: [
          "Nền tảng có thể từ chối mức giá không hợp lệ.",
          "Nền tảng có thể yêu cầu chỉnh giá trước khi publish.",
        ],
      },
      {
        id: "4.3",
        title: "Hiển thị giá",
        bullets: [
          "Giá được hiển thị công khai bằng Orbit Coin.",
          "Creator phải đảm bảo giá phản ánh đúng giá trị nội dung và không gây hiểu nhầm.",
        ],
      },
      {
        id: "4.4",
        title: "Thay đổi giá",
        bullets: [
          "Creator có thể đổi giá bất kỳ lúc nào.",
          "Giá mới chỉ áp dụng cho giao dịch mới và không ảnh hưởng người đã mua trước đó.",
        ],
      },
      {
        id: "4.5",
        title: "Trách nhiệm về giá",
        bullets: [
          "Creator chịu trách nhiệm với quyết định đặt giá và mức độ hợp lý giữa giá, nội dung, trải nghiệm.",
          "Giá không hợp lý có thể ảnh hưởng khả năng duyệt và hiệu suất bán.",
        ],
      },
      {
        id: "4.6",
        title: "Can thiệp của nền tảng",
        bullets: [
          "Nền tảng có thể can thiệp khi giá quá thấp, quá cao, hoặc có dấu hiệu lạm dụng.",
          "Can thiệp có thể gồm yêu cầu chỉnh giá, tạm dừng hiển thị, hoặc chặn publish cho đến khi điều chỉnh.",
        ],
      },
      {
        id: "4.7",
        title: "Lỗi giá",
        bullets: [
          "Nền tảng có thể tạm dừng giao dịch và điều chỉnh giá về trạng thái hợp lệ.",
          "Các giao dịch bị ảnh hưởng có thể được xử lý theo chính sách giao dịch và hoàn tiền.",
        ],
      },
    ],
  },
  {
    id: "5",
    title: "Chính sách doanh thu",
    clauses: [
      {
        id: "5.1",
        title: "Nguyên tắc chia doanh thu",
        bullets: [
          "Doanh thu hợp lệ được chia theo tỷ lệ 90% cho creator và 10% cho nền tảng.",
          "Tỷ lệ áp dụng cho tất cả giao dịch đủ điều kiện.",
        ],
      },
      {
        id: "5.2",
        title: "Ghi nhận doanh thu",
        bullets: [
          "Khi giao dịch thành công, coin người mua bị trừ và phần doanh thu creator được ghi nhận.",
          "Số dư creator gồm Pending Balance và Available Balance.",
        ],
      },
      {
        id: "5.3",
        title: "Thời gian giữ doanh thu",
        bullets: [
          "Doanh thu ban đầu ở trạng thái Pending.",
          "Thời gian giữ thông thường 7 đến 14 ngày.",
          "Nếu không có refund hoặc tranh chấp, doanh thu chuyển sang Available Balance.",
        ],
      },
      {
        id: "5.4",
        title: "Ảnh hưởng của hoàn tiền",
        bullets: [
          "Nếu doanh thu đang Pending, khoản hoàn sẽ trừ vào Pending Balance.",
          "Nếu doanh thu đã Available, nền tảng có thể trừ trực tiếp hoặc ghi nhận Negative Balance.",
        ],
      },
      {
        id: "5.5",
        title: "Điều kiện ghi nhận doanh thu hợp lệ",
        bullets: [
          "Giao dịch phải ở trạng thái Success.",
          "Nội dung phải được publish hợp lệ.",
          "Không có dấu hiệu gian lận hoặc vi phạm policy.",
        ],
      },
      {
        id: "5.6",
        title: "Hạn chế và tạm giữ doanh thu",
        bullets: [
          "Nền tảng có thể tạm giữ hoặc hạn chế doanh thu khi có refund hoặc khiếu nại đang xử lý.",
          "Nền tảng có thể tạm giữ hoặc hạn chế doanh thu khi phát hiện dấu hiệu bất thường, gian lận, hoặc nội dung vi phạm.",
        ],
      },
      {
        id: "5.7",
        title: "Gian lận doanh thu",
        bullets: [
          "Nghiêm cấm self-purchase, tạo giao dịch giả bằng nhiều tài khoản, hoặc khai thác hệ thống để tăng doanh thu không hợp lệ.",
          "Nền tảng có thể hủy doanh thu, đóng băng số dư, ghi nhận âm và khóa tài khoản tùy mức độ.",
        ],
      },
      {
        id: "5.8",
        title: "Quyền kiểm soát của nền tảng",
        bullets: [
          "Nền tảng có quyền điều chỉnh doanh thu khi sai lệch dữ liệu, lỗi hệ thống, hoặc tranh chấp.",
          "Mọi quyết định liên quan doanh thu thuộc quyền cuối cùng của nền tảng.",
        ],
      },
    ],
  },
  {
    id: "6",
    title: "Cập nhật và bảo trì nội dung",
    clauses: [
      {
        id: "6.1",
        title: "Quyền cập nhật nội dung",
        bullets: [
          "Creator có thể cập nhật nội dung đã publish.",
          "Cập nhật có thể gồm sửa lỗi, cải thiện gameplay, chỉnh độ khó và thay đổi cơ chế.",
        ],
      },
      {
        id: "6.2",
        title: "Yêu cầu duyệt lại sau khi cập nhật",
        bullets: [
          "Thay đổi lớn về gameplay, cấu trúc map, hoặc mechanic quan trọng có thể yêu cầu duyệt lại.",
          "Nội dung có thể chuyển về Pending trước khi bản cập nhật được áp dụng.",
        ],
      },
      {
        id: "6.3",
        title: "Trách nhiệm bảo trì",
        bullets: [
          "Creator phải đảm bảo nội dung luôn playable, ổn định và đúng mô tả.",
          "Creator cần chủ động sửa lỗi và duy trì chất lượng.",
        ],
      },
      {
        id: "6.4",
        title: "Ảnh hưởng đến người đã mua",
        bullets: [
          "Người đã mua được truy cập phiên bản mới nhất.",
          "Creator không được thay đổi theo hướng làm sai khác nghiêm trọng trải nghiệm đã mua hoặc làm giảm chất lượng.",
        ],
      },
      {
        id: "6.5",
        title: "Cập nhật gây ảnh hưởng tiêu cực",
        bullets: [
          "Nếu bản cập nhật làm nội dung không thể chơi, sai mô tả, hoặc trải nghiệm kém đi, nền tảng có thể yêu cầu khắc phục.",
          "Nền tảng có thể tạm dừng, gỡ nội dung, và áp dụng refund policy khi cần.",
        ],
      },
      {
        id: "6.6",
        title: "Không duy trì nội dung",
        bullets: [
          "Nếu creator không sửa lỗi nghiêm trọng trong thời gian hợp lý, nền tảng có thể unpublish, disable, hoặc gỡ nội dung.",
          "Nền tảng có thể tạm dừng bán cho đến khi chất lượng được khôi phục.",
        ],
      },
      {
        id: "6.7",
        title: "Gỡ nội dung bởi Creator",
        bullets: [
          "Creator có thể yêu cầu gỡ nội dung của mình.",
          "Việc gỡ không được làm mất quyền truy cập của người đã mua trước đó trừ khi nền tảng quyết định khác.",
        ],
      },
      {
        id: "6.8",
        title: "Quyền can thiệp của nền tảng",
        bullets: [
          "Nền tảng có thể tự động hoặc thủ công gỡ, khóa, hoặc yêu cầu cập nhật với nội dung vi phạm hoặc gây hại.",
        ],
      },
      {
        id: "6.9",
        title: "Quyết định cuối cùng",
        bullets: [
          "Nền tảng có quyền quyết định cuối cùng đối với chấp nhận cập nhật, trạng thái sau cập nhật, và biện pháp xử lý liên quan.",
        ],
      },
    ],
  },
  {
    id: "7",
    title: "Hành vi bị cấm",
    clauses: [
      {
        id: "7.1",
        title: "Gian lận doanh thu",
        bullets: [
          "Nghiêm cấm self-purchase, dùng nhiều tài khoản tạo doanh thu giả, hoặc thông đồng tạo giao dịch giả.",
        ],
      },
      {
        id: "7.2",
        title: "Lạm dụng hệ thống thanh toán",
        bullets: [
          "Nghiêm cấm khai thác lỗi giá, lỗi thanh toán hoặc tạo giao dịch bất thường.",
          "Nghiêm cấm can thiệp luồng thanh toán hoặc lách cơ chế kiểm soát giao dịch.",
        ],
      },
      {
        id: "7.3",
        title: "Lạm dụng chính sách hoàn tiền",
        bullets: [
          "Nghiêm cấm tạo vòng lặp mua-hoàn để trục lợi.",
          "Nghiêm cấm tạo nội dung nhằm khai thác hành vi refund bất thường.",
        ],
      },
      {
        id: "7.4",
        title: "Spam và nội dung chất lượng thấp",
        bullets: [
          "Nghiêm cấm đăng hàng loạt nội dung trùng lặp hoặc ít giá trị gameplay.",
          "Nghiêm cấm spam nhằm chiếm vị trí hiển thị hoặc làm nhiễu hệ thống.",
        ],
      },
      {
        id: "7.5",
        title: "Nội dung gây hại hệ thống",
        bullets: [
          "Nghiêm cấm nội dung gây lỗi hệ thống, gián đoạn trải nghiệm, hoặc tạo nguy cơ khai thác lỗ hổng.",
        ],
      },
      {
        id: "7.6",
        title: "Giả mạo hoặc gây hiểu nhầm",
        bullets: [
          "Nghiêm cấm thông tin sai lệch, mô tả hoặc hình ảnh gây hiểu nhầm, và giả mạo creator khác.",
        ],
      },
      {
        id: "7.7",
        title: "Lách cơ chế kiểm duyệt",
        bullets: [
          "Nghiêm cấm thay đổi nội dung đã duyệt để đưa vào yếu tố chưa kiểm duyệt.",
          "Nghiêm cấm tìm cách bypass quy trình review.",
        ],
      },
      {
        id: "7.8",
        title: "Sử dụng trái phép tài khoản",
        bullets: [
          "Nghiêm cấm dùng tài khoản người khác hoặc cho mượn tài khoản để đăng nội dung.",
          "Nghiêm cấm tạo hàng loạt tài khoản phục vụ gian lận.",
        ],
      },
      {
        id: "7.9",
        title: "Hành vi gây ảnh hưởng tiêu cực",
        bullets: [
          "Nghiêm cấm hành vi làm xấu trải nghiệm người dùng, mất công bằng marketplace, hoặc giảm uy tín nền tảng.",
        ],
      },
      {
        id: "7.10",
        title: "Hậu quả của vi phạm",
        bullets: [
          "Nền tảng có thể gỡ nội dung, tạm dừng quyền creator, đóng băng hoặc thu hồi doanh thu, ghi nhận số dư âm, và khóa tài khoản.",
        ],
      },
      {
        id: "7.11",
        title: "Quyền đánh giá và xử lý",
        bullets: [
          "Nền tảng có quyền phát hiện và đánh giá vi phạm dựa trên dữ liệu hệ thống, lịch sử giao dịch, và hành vi người dùng.",
          "Với trường hợp nghiêm trọng, biện pháp xử lý có thể áp dụng mà không cần báo trước.",
        ],
      },
    ],
  },
  {
    id: "8",
    title: "Xử lý vi phạm",
    clauses: [
      {
        id: "8.1",
        title: "Nguyên tắc xử lý",
        bullets: [
          "Mục tiêu xử lý là bảo đảm công bằng, bảo vệ người dùng và hệ thống.",
          "Mức xử lý phụ thuộc tính chất vi phạm, mức ảnh hưởng và lịch sử hành vi.",
        ],
      },
      {
        id: "8.2",
        title: "Các mức xử lý",
        bullets: [
          "Warning: áp dụng với lỗi nhẹ lần đầu, thường kèm yêu cầu chỉnh sửa.",
          "Restriction: áp dụng với tái phạm hoặc vi phạm mức trung bình, có thể hạn chế một phần chức năng.",
          "Suspension: áp dụng với vi phạm nghiêm trọng hoặc dấu hiệu gian lận, có thể tạm khóa tài khoản và đóng băng doanh thu.",
          "Ban: áp dụng với gian lận lớn hoặc tái phạm nặng, có thể khóa vĩnh viễn và gỡ toàn bộ nội dung.",
        ],
      },
      {
        id: "8.3",
        title: "Bỏ qua các bước trung gian",
        bullets: [
          "Trong trường hợp nghiêm trọng, nền tảng có thể bỏ qua mức xử lý thấp và áp dụng trực tiếp mức cao hơn.",
        ],
      },
      {
        id: "8.4",
        title: "Ảnh hưởng đến nội dung và doanh thu",
        bullets: [
          "Tùy mức độ, nội dung có thể bị gỡ, ẩn, hoặc hạn chế truy cập.",
          "Doanh thu có thể bị đóng băng, thu hồi hoặc điều chỉnh.",
        ],
      },
      {
        id: "8.5",
        title: "Khiếu nại",
        bullets: [
          "Creator có thể gửi yêu cầu khiếu nại kết quả xử lý vi phạm.",
          "Nền tảng có thể giữ nguyên hoặc điều chỉnh quyết định.",
        ],
      },
      {
        id: "8.6",
        title: "Quyền quyết định cuối cùng",
        bullets: [
          "Mọi quyết định xử lý vi phạm thuộc quyền của nền tảng dựa trên đánh giá nội bộ.",
          "Khi cần thiết, biện pháp xử lý có thể áp dụng mà không cần thông báo trước.",
        ],
      },
    ],
  },
];

export default function SellerPolicyVIPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f6f2ea] via-[#f3f8ff] to-[#edf7f1] text-[#14213d]">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <header className="rounded-3xl border border-[#b8cad6] bg-white/80 p-6 shadow-lg shadow-[#99a9bb]/20 backdrop-blur-sm sm:p-8 lg:p-10">
          <p className="inline-flex rounded-full border border-[#1d4ed8]/30 bg-[#1d4ed8]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#1d4ed8]">
            Chính sách người bán
          </p>
          <h1
            className="mt-4 text-3xl font-black leading-tight sm:text-4xl lg:text-5xl"
            style={{ fontFamily: "Merriweather, Georgia, serif" }}
          >
            Chính Sách Người Bán và Quản Trị Creator
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#3b4a68] sm:text-base">
            Trang này tổng hợp chính sách dành cho creator, bao gồm điều kiện tham gia, kiểm duyệt,
            cơ chế đặt giá, doanh thu, bảo trì nội dung, hành vi bị cấm và quy trình xử lý vi phạm.
          </p>
          <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-[#5f6f8f]">
            Cập nhật gần nhất: 17/04/2026
          </p>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {highlights.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-[#c7d8e3] bg-white/75 p-4 shadow-sm shadow-[#aabccd]/30"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#4e627f]">
                {item.title}
              </p>
              <p
                className="mt-2 text-xl font-extrabold text-[#0f172a]"
                style={{ fontFamily: "Merriweather, Georgia, serif" }}
              >
                {item.value}
              </p>
              <p className="mt-2 text-sm leading-6 text-[#42536f]">{item.description}</p>
            </article>
          ))}
        </section>

        <section className="mt-10 space-y-6">
          {policySections.map((section) => (
            <article
              key={section.id}
              className="rounded-3xl border border-[#c6d5de] bg-white/85 p-5 shadow-md shadow-[#9fb0bf]/20 sm:p-7"
            >
              <h2
                className="text-2xl font-bold text-[#0b2c4a] sm:text-3xl"
                style={{ fontFamily: "Merriweather, Georgia, serif" }}
              >
                {section.id}. {section.title}
              </h2>

              <div className="mt-6 space-y-5">
                {section.clauses.map((clause) => (
                  <div key={clause.id} className="rounded-2xl border border-[#d6e2e9] bg-[#fbfcff] p-4 sm:p-5">
                    <h3 className="text-lg font-bold text-[#173d63] sm:text-xl">
                      {clause.id}. {clause.title}
                    </h3>

                    {clause.paragraphs?.map((text, index) => (
                      <p
                        key={`${clause.id}-paragraph-${index}`}
                        className="mt-3 text-sm leading-7 text-[#2f4566] sm:text-base"
                      >
                        {text}
                      </p>
                    ))}

                    {clause.steps && clause.steps.length > 0 ? (
                      <ol className="mt-3 list-decimal space-y-2 pl-6 text-sm leading-7 text-[#2f4566] sm:text-base">
                        {clause.steps.map((step) => (
                          <li key={step}>{step}</li>
                        ))}
                      </ol>
                    ) : null}

                    {clause.bullets && clause.bullets.length > 0 ? (
                      <ul className="mt-3 list-disc space-y-2 pl-6 text-sm leading-7 text-[#2f4566] sm:text-base">
                        {clause.bullets.map((bullet) => (
                          <li key={bullet}>{bullet}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
