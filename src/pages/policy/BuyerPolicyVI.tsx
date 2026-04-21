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
    title: "Quyền truy cập",
    value: "Trọn đời",
    description: "Nội dung đã mua được truy cập không giới hạn thời gian trên nền tảng.",
  },
  {
    title: "Đơn vị thanh toán",
    value: "Orbit Coin",
    description: "Toàn bộ giao dịch mua game sử dụng Orbit Coin.",
  },
  {
    title: "Hạn gửi hoàn tiền",
    value: "2 ngày",
    description: "Yêu cầu hoàn tiền hợp lệ cần gửi trong vòng 2 ngày từ thời điểm mua.",
  },
  {
    title: "Thời gian xử lý",
    value: "24-72 giờ",
    description: "Yêu cầu hoàn tiền được kiểm tra và phản hồi trong khoảng 24 đến 72 giờ.",
  },
];

const policySections: PolicySection[] = [
  {
    id: "1",
    title: "Chính sách quyền sở hữu",
    clauses: [
      {
        id: "1.1",
        title: "Quyền sử dụng sau khi mua",
        paragraphs: [
          "Khi người dùng mua game trên nền tảng, người dùng được cấp quyền truy cập và sử dụng không giới hạn thời gian.",
          "Quyền này bao gồm việc chơi game trên nền tảng và truy cập nội dung liên quan nếu có.",
          "Quyền sử dụng gắn với tài khoản người mua và không được chuyển nhượng cho người khác.",
        ],
      },
      {
        id: "1.2",
        title: "Giới hạn quyền sở hữu",
        paragraphs: [
          "Việc mua game không đồng nghĩa với việc sở hữu nội dung gốc.",
        ],
        bullets: [
          "Không được tải xuống, sao chép hoặc trích xuất source code, asset, hoặc dữ liệu game.",
          "Không được phân phối lại, bán lại, hoặc chia sẻ tài khoản để người khác sử dụng.",
          "Không được sử dụng nội dung đã mua cho mục đích thương mại ngoài nền tảng.",
        ],
      },
      {
        id: "1.3",
        title: "Quyền của nền tảng",
        bullets: [
          "Lưu trữ, phân phối và hiển thị game đến người dùng.",
          "Chỉnh sửa, ẩn hoặc gỡ bỏ nội dung khi cần thiết, bao gồm vi phạm policy hoặc lỗi kỹ thuật.",
          "Sử dụng nội dung cho mục đích vận hành và cải thiện sản phẩm.",
        ],
      },
      {
        id: "1.4",
        title: "Quyền của Creator",
        bullets: [
          "Creator giữ quyền sở hữu nội dung gốc do họ tạo ra.",
          "Khi đăng tải nội dung, Creator đồng ý cấp quyền cho nền tảng phân phối.",
          "Creator đồng ý cho phép người dùng khác mua và sử dụng theo policy.",
          "Creator không được rút lại quyền truy cập của người dùng đã mua trước đó.",
        ],
      },
      {
        id: "1.5",
        title: "Trường hợp nội dung bị gỡ bỏ",
        bullets: [
          "Người dùng đã mua trước đó có thể tiếp tục truy cập nếu không có vi phạm nghiêm trọng.",
          "Nếu không thể duy trì truy cập, trường hợp có thể được xử lý theo chính sách hoàn tiền.",
          "Nền tảng có quyền quyết định cuối cùng với các trường hợp vi phạm nội dung, lỗi nghiêm trọng, hoặc yêu cầu pháp lý.",
        ],
      },
      {
        id: "1.6",
        title: "Tài khoản và quyền truy cập",
        bullets: [
          "Quyền truy cập nội dung đã mua gắn liền với tài khoản người dùng.",
          "Quyền truy cập có thể bị hạn chế hoặc thu hồi nếu tài khoản bị khóa, có hành vi gian lận, hoặc lạm dụng hệ thống.",
        ],
      },
    ],
  },
  {
    id: "2",
    title: "Chính sách giá và đơn vị tiền tệ",
    clauses: [
      {
        id: "2.1",
        title: "Đơn vị tiền tệ sử dụng (Orbit Coin)",
        bullets: [
          "Nền tảng dùng Orbit Coin làm đơn vị thanh toán duy nhất cho giao dịch mua game.",
          "Người dùng cần nạp tiền để chuyển đổi thành Orbit Coin trước khi mua.",
          "Orbit Coin chỉ có giá trị sử dụng trong nền tảng.",
        ],
      },
      {
        id: "2.2",
        title: "Nạp coin (Top-up)",
        bullets: [
          "Người dùng có thể nạp Orbit Coin qua các phương thức thanh toán được hỗ trợ.",
          "Số coin nhận được hiển thị rõ ràng trước khi xác nhận thanh toán.",
          "Sau khi thanh toán thành công, coin được cộng vào tài khoản và giao dịch được lưu vào lịch sử.",
        ],
      },
      {
        id: "2.3",
        title: "Thiết lập giá (Pricing Rules)",
        bullets: [
          "Nội dung do nền tảng cung cấp được hệ thống thiết lập và quản lý giá.",
          "Nội dung do Creator tạo có thể tự đặt giá trong phạm vi cho phép.",
          "Nền tảng có quyền áp dụng mức giá tối thiểu, tối đa, điều chỉnh hoặc từ chối giá không phù hợp.",
        ],
      },
      {
        id: "2.4",
        title: "Hiển thị giá",
        bullets: [
          "Tất cả giá được hiển thị rõ ràng bằng Orbit Coin trước khi mua.",
          "Thông tin hiển thị bao gồm giá game và số dư hiện tại của người dùng khi có.",
          "Không có chi phí ẩn ngoài số coin đã hiển thị.",
        ],
      },
      {
        id: "2.5",
        title: "Chính sách số dư (Wallet Policy)",
        paragraphs: [
          "2.5.1. Sử dụng Orbit Coin",
          "Orbit Coin được sử dụng để mua game trên nền tảng và nhận doanh thu từ việc bán nội dung đối với Creator.",
          "2.5.2. Quy đổi Orbit Coin sang tiền mặt",
          "Người dùng có thể yêu cầu quy đổi Orbit Coin thành tiền mặt (cash-out) nếu đủ điều kiện. Việc quy đổi chỉ áp dụng cho số dư hợp lệ và phải thông qua các phương thức do nền tảng hỗ trợ.",
          "2.5.3. Điều kiện rút tiền (Cash-out Conditions)",
          "Để thực hiện rút tiền, người dùng phải có Available Balance (không phải Pending), đạt mức tối thiểu để rút tiền, và không có tranh chấp đang xử lý, yêu cầu hoàn tiền liên quan, hoặc dấu hiệu gian lận.",
          "2.5.4. Thời gian xử lý",
          "Yêu cầu rút tiền sẽ được xử lý trong 3 ngày làm việc. Nền tảng có quyền tạm hoãn xử lý nếu cần kiểm tra thêm.",
          "2.5.5. Phí và tỷ giá quy đổi",
          "Việc quy đổi có thể áp dụng phí giao dịch (transaction fee) và tỷ giá quy đổi (exchange rate) giữa Orbit Coin và tiền mặt. Tất cả thông tin sẽ được hiển thị rõ trước khi người dùng xác nhận rút tiền.",
          "2.5.6. Hạn chế và kiểm soát",
          "Nền tảng có quyền từ chối hoặc trì hoãn rút tiền trong các trường hợp phát hiện giao dịch bất thường, nghi ngờ gian lận hoặc lạm dụng hệ thống, hoặc vi phạm chính sách nền tảng.",
          "2.5.7. Số dư không hợp lệ",
          "Các loại số dư không đủ điều kiện rút gồm số dư từ giao dịch chưa hoàn tất (Pending), số dư liên quan đến giao dịch bị hoàn tiền, và số dư bị đánh dấu nghi ngờ gian lận.",
          "2.5.8. Trách nhiệm người dùng",
          "Người dùng chịu trách nhiệm cung cấp thông tin thanh toán chính xác, tuân thủ quy định pháp luật liên quan đến nhận tiền, và đảm bảo tài khoản không bị sử dụng trái phép.",
        ],
      },
      {
        id: "2.6",
        title: "Thay đổi giá",
        bullets: [
          "Giá game có thể thay đổi theo thời gian.",
          "Giá tại thời điểm người dùng xác nhận mua là giá cuối cùng cho giao dịch đó.",
          "Thay đổi giá về sau không ảnh hưởng giao dịch đã hoàn tất.",
        ],
      },
      {
        id: "2.7",
        title: "Lỗi giá và xử lý",
        bullets: [
          "Nền tảng có thể tạm dừng hoặc hủy giao dịch khi phát hiện giá không hợp lệ.",
          "Nếu coin đã bị trừ do lỗi giá, nền tảng hoàn lại Orbit Coin cho người dùng.",
          "Người dùng được thông báo rõ ràng khi xảy ra lỗi liên quan đến giá.",
        ],
      },
    ],
  },
  {
    id: "3",
    title: "Chính sách giao dịch",
    clauses: [
      {
        id: "3.1",
        title: "Điều kiện thực hiện giao dịch",
        bullets: [
          "Người dùng phải đăng nhập hợp lệ.",
          "Game phải ở trạng thái có thể mua (published hoặc active).",
          "Người dùng chưa sở hữu nội dung đó trước đó.",
          "Tài khoản có đủ số dư Orbit Coin.",
          "Nếu bất kỳ điều kiện nào không thỏa mãn, giao dịch sẽ không được thực hiện.",
        ],
      },
      {
        id: "3.2",
        title: "Quy trình giao dịch",
        steps: [
          "Hệ thống xác nhận lại thông tin giao dịch gồm giá, nội dung và số dư.",
          "Thực hiện trừ Orbit Coin từ tài khoản người dùng.",
          "Ghi nhận giao dịch vào transaction log.",
          "Cấp quyền truy cập game cho người dùng.",
        ],
        bullets: [
          "Toàn bộ quy trình được thiết kế theo nguyên tắc atomic: hoặc tất cả bước thành công, hoặc không có thay đổi nào được ghi nhận.",
        ],
      },
      {
        id: "3.3",
        title: "Trạng thái giao dịch",
        bullets: [
          "Pending: giao dịch đang xử lý.",
          "Success: giao dịch thành công, coin đã bị trừ và quyền truy cập đã cấp.",
          "Failed: giao dịch thất bại, số dư không thay đổi.",
          "Cancelled: giao dịch bị hủy bởi hệ thống hoặc người dùng khi áp dụng.",
          "Người dùng có thể xem trạng thái trong lịch sử giao dịch.",
        ],
      },
      {
        id: "3.4",
        title: "Xử lý lỗi và gián đoạn",
        bullets: [
          "Nếu coin chưa bị trừ, giao dịch được đánh dấu Failed.",
          "Nếu coin đã bị trừ nhưng chưa cấp quyền, hệ thống tự động hoàn coin hoặc hoàn tất cấp quyền.",
          "Hệ thống đảm bảo không xảy ra tình trạng mất coin nhưng không nhận được nội dung.",
        ],
      },
      {
        id: "3.5",
        title: "Giao dịch trùng lặp",
        bullets: [
          "Mỗi giao dịch có mã định danh duy nhất (Transaction ID).",
          "Hệ thống ngăn chặn xử lý trùng lặp và bỏ qua request retry lặp lại.",
        ],
      },
      {
        id: "3.6",
        title: "Lịch sử giao dịch",
        bullets: [
          "Tất cả giao dịch được lưu lại gồm nội dung đã mua, số coin sử dụng, thời gian và trạng thái.",
          "Người dùng có thể truy cập lịch sử để kiểm tra và đối soát khi phát sinh vấn đề.",
        ],
      },
      {
        id: "3.7",
        title: "Quyền kiểm soát của nền tảng",
        bullets: [
          "Nền tảng có thể tạm dừng hoặc từ chối giao dịch khi phát hiện hành vi bất thường, gian lận hoặc lỗi hệ thống.",
          "Nền tảng có thể điều chỉnh hoặc khôi phục giao dịch để đảm bảo tính chính xác và công bằng.",
        ],
      },
      {
        id: "3.8",
        title: "Gian lận và lạm dụng",
        bullets: [
          "Lợi dụng lỗi giá để mua nội dung với giá sai là hành vi bị nghiêm cấm.",
          "Tạo chuỗi giao dịch bất thường để khai thác hệ thống là hành vi bị nghiêm cấm.",
          "Can thiệp vào quá trình thanh toán là hành vi bị nghiêm cấm.",
          "Nền tảng có thể hủy giao dịch, thu hồi quyền truy cập hoặc khóa tài khoản tùy mức độ.",
        ],
      },
    ],
  },
  {
    id: "4",
    title: "Chính sách hoàn tiền",
    clauses: [
      {
        id: "4.1",
        title: "Nguyên tắc chung",
        bullets: [
          "Mặc định, giao dịch mua bằng Orbit Coin là không hoàn tiền.",
          "Người dùng có thể yêu cầu hoàn tiền trong các trường hợp cụ thể được quy định.",
          "Hoàn tiền được xử lý thủ công hoặc bán tự động và hoàn lại dưới dạng Orbit Coin.",
        ],
      },
      {
        id: "4.2",
        title: "Các trường hợp được chấp nhận hoàn tiền",
        bullets: [
          "Nội dung không thể chơi: không thể hoàn thành, bị kẹt soft lock, hoặc lỗi cơ chế như cửa, chìa khóa, công tắc không hoạt động.",
          "Nội dung không đúng mô tả: độ khó, gameplay, hoặc objective khác biệt đáng kể.",
          "Lỗi giao dịch hệ thống: coin đã bị trừ nhưng không nhận đúng quyền truy cập.",
          "Nội dung bị gỡ sau khi mua do vi phạm policy hoặc lỗi nghiêm trọng.",
        ],
      },
      {
        id: "4.3",
        title: "Điều kiện áp dụng hoàn tiền",
        bullets: [
          "Yêu cầu cần gửi trong vòng 2 ngày kể từ thời điểm mua.",
          "Nội dung chưa bị tiêu thụ quá mức, ví dụ chưa hoàn thành game hoặc không chơi quá nhiều lần theo hướng lạm dụng.",
        ],
      },
      {
        id: "4.4",
        title: "Các trường hợp không được hoàn tiền",
        bullets: [
          "Người dùng đã hoàn thành game.",
          "Người dùng đã chơi trong thời gian dài theo dấu hiệu abuse.",
          "Lý do chủ quan như không thích nội dung.",
          "Lý do quá khó nhưng nội dung đã mô tả đúng.",
          "Mua nhầm do không kiểm tra kỹ trước khi xác nhận.",
          "Nội dung hoạt động đúng và phù hợp mô tả công khai.",
        ],
      },
      {
        id: "4.5",
        title: "Quy trình xử lý hoàn tiền",
        steps: [
          "Người dùng gửi yêu cầu hoàn tiền kèm lý do.",
          "Hệ thống hoặc admin kiểm tra trạng thái nội dung và lịch sử chơi.",
          "Kết quả trả về: Approved để hoàn coin hoặc Rejected kèm lý do từ chối.",
        ],
      },
      {
        id: "4.6",
        title: "Thời gian xử lý",
        bullets: [
          "Thời gian xử lý thông thường là 24 đến 72 giờ.",
          "Người dùng được thông báo khi có kết quả cuối cùng.",
        ],
      },
      {
        id: "4.7",
        title: "Lạm dụng chính sách hoàn tiền",
        bullets: [
          "Liên tục mua rồi hoàn để chơi miễn phí là hành vi lạm dụng.",
          "Gửi yêu cầu hoàn tiền không hợp lệ nhiều lần là hành vi lạm dụng.",
          "Nền tảng có thể từ chối hoàn tiền, hạn chế quyền gửi yêu cầu, hoặc khóa tài khoản.",
        ],
      },
    ],
  },
  {
    id: "5",
    title: "Chính sách lạm dụng và tình huống đặc biệt",
    clauses: [
      {
        id: "5.1",
        title: "Nội dung bị xóa sau khi mua",
        bullets: [
          "Người dùng đã mua có thể tiếp tục truy cập nếu nội dung vẫn hoạt động bình thường.",
          "Nếu nội dung không còn sử dụng được, người dùng có thể yêu cầu hoàn tiền.",
          "Nền tảng quyết định giữ quyền truy cập hoặc thu hồi và xử lý hoàn tiền theo từng trường hợp.",
        ],
      },
      {
        id: "5.2",
        title: "Cập nhật nội dung sau khi mua",
        bullets: [
          "Người dùng đã mua được truy cập phiên bản mới nhất mà không cần thanh toán thêm.",
          "Nếu cập nhật làm thay đổi nghiêm trọng trải nghiệm ban đầu, yêu cầu hoàn tiền có thể được xem xét theo Refund Policy.",
        ],
      },
      {
        id: "5.3",
        title: "Mua trùng nội dung",
        bullets: [
          "Người dùng không thể mua lại game đã sở hữu.",
          "Hệ thống tự động chặn giao dịch trùng hoặc hiển thị cảnh báo rõ ràng trước khi thanh toán.",
        ],
      },
      {
        id: "5.4",
        title: "Gián đoạn trong quá trình mua",
        bullets: [
          "Khi có mất mạng, refresh, hoặc crash, hệ thống tự động kiểm tra trạng thái giao dịch.",
          "Nếu giao dịch đã thành công, quyền truy cập được cấp.",
          "Nếu giao dịch chưa hoàn tất, coin sẽ không bị trừ.",
        ],
      },
      {
        id: "5.5",
        title: "Thay đổi trạng thái nội dung",
        bullets: [
          "Từ public sang private, unlisted, hoặc disabled: người đã mua vẫn giữ quyền truy cập, trừ khi có vi phạm nghiêm trọng.",
          "Nếu nội dung bị khóa do vi phạm, quyền truy cập có thể bị thu hồi và có thể được hoàn tiền theo mức độ.",
        ],
      },
      {
        id: "5.6",
        title: "Tài khoản bị khóa hoặc hạn chế",
        bullets: [
          "Nếu tài khoản bị tạm khóa hoặc khóa vĩnh viễn, quyền truy cập nội dung đã mua có thể bị hạn chế hoặc thu hồi.",
          "Tùy mức độ vi phạm, nền tảng quyết định giữ nguyên hoặc vô hiệu hóa toàn bộ quyền truy cập.",
        ],
      },
      {
        id: "5.7",
        title: "Giao dịch bất thường",
        bullets: [
          "Bao gồm mua hàng loạt trong thời gian ngắn, thao tác liên tục gây lỗi hệ thống, hoặc dùng script hoặc tool tự động mua.",
          "Nền tảng có thể tạm dừng giao dịch và yêu cầu xác minh bổ sung.",
        ],
      },
      {
        id: "5.8",
        title: "Lỗi hệ thống và dữ liệu",
        bullets: [
          "Khi xảy ra sai lệch số dư Orbit Coin hoặc sai trạng thái sở hữu, nền tảng có quyền điều chỉnh dữ liệu về trạng thái chính xác.",
          "Quyền truy cập có thể bị thu hồi hoặc cấp lại tương ứng và người dùng được thông báo nếu bị ảnh hưởng.",
        ],
      },
      {
        id: "5.9",
        title: "Quyết định cuối cùng",
        bullets: [
          "Với các trường hợp chưa được nêu rõ trong chính sách, nền tảng có quyền quyết định cuối cùng.",
          "Quyết định dựa trên tính công bằng, lịch sử giao dịch, và mức độ ảnh hưởng đến hệ thống và người dùng khác.",
        ],
      },
    ],
  },
];

export default function BuyerPolicyVIPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f7f4ec] via-[#f4f8ff] to-[#eef6f2] text-[#14213d]">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <header className="rounded-3xl border border-[#b8cad6] bg-white/80 p-6 shadow-lg shadow-[#99a9bb]/20 backdrop-blur-sm sm:p-8 lg:p-10">
          <p className="inline-flex rounded-full border border-[#0f766e]/30 bg-[#0f766e]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#0f766e]">
            Chính sách người mua
          </p>
          <h1
            className="mt-4 text-3xl font-black leading-tight sm:text-4xl lg:text-5xl"
          >
            Chính Sách Người Mua và Bảo Vệ Giao Dịch
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#3b4a68] sm:text-base">
            Trang này tổng hợp đầy đủ quyền sở hữu, quy tắc giá bằng Orbit Coin, luồng xử lý
            giao dịch, điều kiện hoàn tiền, và các tình huống lạm dụng hoặc edge case dành cho
            người mua trên nền tảng.
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
                      <p key={`${clause.id}-paragraph-${index}`} className="mt-3 text-sm leading-7 text-[#2f4566] sm:text-base">
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
