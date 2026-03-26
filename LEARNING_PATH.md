# Learning Path (Lộ trình học) – Tổng quan

## Mục đích

Giúp người chơi có **lộ trình học** rõ ràng: chọn mục tiêu (logic cơ bản, điều kiện, vòng lặp, giải quyết vấn đề) → hệ thống hiển thị danh sách **concept** (khái niệm) và **map thử thách** xếp từ dễ đến khó. Hoàn thành từng bước → mở khóa bước tiếp theo; tiến độ được lưu và có gợi ý ôn tập phần còn yếu.

---

## Giải thích chi tiết từng Entity (bảng)

### 1. LearningGoal (Mục tiêu học tập)

**Là gì:** Các **hướng học** mà user có thể chọn khi vào app, ví dụ: “Logic cơ bản”, “Điều kiện”, “Vòng lặp”, “Giải quyết vấn đề”.

**Lưu gì:**

- `Name`: tên hiển thị (vd: "Logic cơ bản").
- `Description`: mô tả ngắn (vd: "Làm quen với biến, phép toán, điều khiển luồng cơ bản").
- `SortOrder`: thứ tự hiển thị trên màn chọn mục tiêu (số nhỏ = lên trước).
- `IconUrl`: (tuỳ chọn) ảnh/icon cho mục tiêu.

**Dùng để làm gì:** Khi user đăng nhập / vào lần đầu, màn hình “Chọn mục tiêu học tập” gọi API `GET goals` → trả về danh sách **LearningGoal** → user chọn một cái. Mỗi mục tiêu sẽ có **một lộ trình** riêng (nhiều concept + nhiều map xếp thứ tự).

---

### 2. Concept (Khái niệm)

**Là gì:** Một **bài lý thuyết / khái niệm** nằm trong một mục tiêu học tập. Ví dụ: trong mục tiêu “Logic cơ bản” có concept “Biến là gì”, “Phép toán”, “Thứ tự thực thi”; trong “Điều kiện” có “If-else”, “So sánh”, v.v.

**Lưu gì:**

- `LearningGoalId`: khái niệm này thuộc mục tiêu nào.
- `Name`: tên (vd: "Biến và gán giá trị").
- `Description`: mô tả ngắn.
- `Content`: nội dung lý thuyết (HTML/Markdown) để user **đọc** trên app (vd: giải thích + ví dụ code).
- `SortOrder`: thứ tự trong mục tiêu (dùng khi xếp trong lộ trình).

**Dùng để làm gì:** Trong lộ trình, có những bước là “đọc lý thuyết” thay vì chơi map. Mỗi bước đó trỏ tới một **Concept**. User đọc xong → gọi API “complete concept” → hệ thống ghi lại là đã xong → mở khóa bước tiếp theo (concept hoặc map).

---

### 3. LearningPathItem (Một bước trong lộ trình)

**Là gì:** Một **bước** trong lộ trình học: mỗi bước chỉ có thể là **Concept** (đọc lý thuyết) **hoặc** **Map** (chơi thử thách). Các bước được xếp thứ tự 1, 2, 3… từ dễ đến khó.

**Lưu gì:**

- `LearningGoalId`: lộ trình này thuộc mục tiêu nào.
- `ItemType`: **Concept** (0) hoặc **Map** (1).
- `ConceptId`: nếu bước là “đọc concept” thì trỏ tới bản ghi Concept nào (bước là map thì để null).
- `MapId`: nếu bước là “chơi map” thì trỏ tới Map nào (bước là concept thì để null).
- `SortOrder`: thứ tự trong lộ trình (1, 2, 3…). Unlock theo thứ tự: xong bước 1 mới mở bước 2, xong 2 mới mở 3, v.v.

**Dùng để làm gì:** Khi user đã chọn một **LearningGoal**, API “my-path” sẽ lấy **tất cả LearningPathItem** của goal đó, sort theo `SortOrder`, rồi với từng item:

- Nếu là Concept → hiển thị tên/description/content của concept đó, nút “Đọc” / “Đánh dấu đã đọc”.
- Nếu là Map → hiển thị thông tin map (tên, độ khó, avatar), nút “Chơi”.
- Backend tính **đã hoàn thành chưa** (concept: xem UserConceptProgress; map: xem UserMapResult) và **có mở khóa không** (tất cả bước trước đã xong).

**Ví dụ một lộ trình (LearningGoal = "Logic cơ bản"):**

| SortOrder | ItemType | Nội dung (Concept hoặc Map)        |
| --------- | -------- | ---------------------------------- |
| 1         | Concept  | Khái niệm "Biến là gì"             |
| 2         | Map      | Map thử thách "Làm quen biến" (dễ) |
| 3         | Concept  | Khái niệm "Phép toán"              |
| 4         | Map      | Map "Tính toán cơ bản"             |
| 5         | Map      | Map "Ôn tập logic" (khó hơn)       |

---

### 4. UserLearningGoal (User đang chọn mục tiêu gì)

**Là gì:** Bản ghi lưu **mục tiêu học tập mà user hiện tại đang theo**. Mỗi user chỉ có **một** mục tiêu “đang chọn” (một dòng duy nhất theo UserId).

**Lưu gì:**

- `UserId`: user nào.
- `LearningGoalId`: đang chọn mục tiêu nào (Logic cơ bản / Điều kiện / Vòng lặp / …).
- `SelectedAt`: thời điểm chọn (để biết lần chọn mới nhất nếu có đổi).

**Dùng để làm gì:** Khi gọi API “my-path” hoặc “my-path/progress”, backend cần biết **user này đang học theo mục tiêu nào** → tra bảng **UserLearningGoal** theo UserId → lấy LearningGoalId → từ đó lấy đúng danh sách **LearningPathItem** và tính tiến độ đúng lộ trình đó. Nếu user chưa chọn mục tiêu (không có dòng nào), API trả về lộ trình rỗng / chưa chọn goal.

---

### 5. UserConceptProgress (User đã “xong” concept nào)

**Là gì:** Bản ghi lưu **user đã đọc xong / hoàn thành** khái niệm nào (đánh dấu “đã học” concept đó).

**Lưu gì:**

- `UserId`: user nào.
- `ConceptId`: concept nào được đánh dấu xong.
- `IsCompleted`: true = đã xong.
- `CompletedAt`: thời điểm hoàn thành.

**Dùng để làm gì:**

- Trong **my-path**: với mỗi item kiểu Concept, kiểm tra có bản ghi UserConceptProgress (UserId + ConceptId, IsCompleted = true) không → nếu có thì coi bước đó **đã hoàn thành**.
- **Unlock:** Bước tiếp theo chỉ mở khóa khi bước hiện tại đã xong. Concept “xong” = có UserConceptProgress tương ứng.
- Khi user bấm “Đã đọc xong” trên app → gọi API `POST concepts/{id}/complete` → tạo hoặc cập nhật **UserConceptProgress** cho concept đó.

**Map thì không cần bảng riêng:** Map đã có **UserMapResult** (điểm, sao khi chơi). Backend coi “đã hoàn thành map” khi user có UserMapResult với BestStars >= 1 cho map đó.

---

## Quan hệ giữa các bảng (tóm tắt)

```
LearningGoal (vd: "Logic cơ bản")
    │
    ├── Concept (nhiều): "Biến", "Phép toán", ...
    │       └── UserConceptProgress (user A đã xong concept "Biến")
    │
    └── LearningPathItem (nhiều, có SortOrder):
            - Item 1: Concept "Biến"
            - Item 2: Map "Làm quen biến"
            - Item 3: Concept "Phép toán"
            - Item 4: Map "Tính toán"
            ...

UserLearningGoal (user A đang chọn goal "Logic cơ bản")
    → Dùng để biết lộ trình của user A là danh sách LearningPathItem của goal đó.
```

- **LearningGoal** = một “khóa học” (mục tiêu).
- **Concept** = bài lý thuyết trong khóa đó.
- **LearningPathItem** = từng bước trong khóa: xen kẽ “đọc concept” và “chơi map”, xếp theo SortOrder.
- **UserLearningGoal** = user đang học khóa nào.
- **UserConceptProgress** = user đã đọc xong concept nào (map dùng sẵn **UserMapResult**).

---

## Cấu trúc dữ liệu (bảng tóm tắt)

| Bảng                    | Mô tả                                                                                                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **LearningGoal**        | Mục tiêu học tập (vd: Logic cơ bản, Điều kiện, Vòng lặp, Giải quyết vấn đề). Có Name, Description, SortOrder, IconUrl.                       |
| **Concept**             | Khái niệm thuộc một goal (vd: Biến, If-else, For loop). Có LearningGoalId, Name, Description, Content (lý thuyết), SortOrder.                |
| **LearningPathItem**    | Một bước trong lộ trình: **Concept** hoặc **Map**, có SortOrder. LearningGoalId, ItemType (0=Concept, 1=Map), ConceptId?, MapId?, SortOrder. |
| **UserLearningGoal**    | Mục tiêu user đã chọn. UserId (unique), LearningGoalId, SelectedAt. Mỗi user một dòng, cập nhật khi đổi mục tiêu.                            |
| **UserConceptProgress** | User đã hoàn thành concept chưa. UserId, ConceptId, IsCompleted, CompletedAt.                                                                |

- **Map** đã có sẵn; hoàn thành map được suy ra từ **UserMapResult** (BestStars >= 1).
- Unlock: item thứ N được mở khóa khi **tất cả** item có SortOrder nhỏ hơn N đã hoàn thành (concept = UserConceptProgress.IsCompleted, map = có UserMapResult với BestStars >= 1).

## API Learner (base URL: `/api/learner/learning-path`)

| Method | Path                          | Mô tả                                                                                        | Auth           |
| ------ | ----------------------------- | -------------------------------------------------------------------------------------------- | -------------- |
| GET    | goals                         | Danh sách mục tiêu học tập để chọn                                                           | Không bắt buộc |
| POST   | goals/select                  | Chọn mục tiêu (body: `{ "learningGoalId": "guid" }`)                                         | Có             |
| GET    | my-path                       | Lộ trình hiện tại: goal + danh sách item (concept/map) + IsCompleted, IsUnlocked, BestStars… | Có             |
| GET    | my-path/progress              | Tiến độ: TotalItems, CompletedCount, PercentComplete, SuggestedReviewMapIds                  | Có             |
| POST   | concepts/{conceptId}/complete | Đánh dấu đã hoàn thành khái niệm → mở khóa item tiếp theo                                    | Có             |

## Luồng FE gợi ý

1. **Sau đăng nhập / lần đầu vào app:** Gọi `GET goals` → hiển thị màn chọn mục tiêu (card từng goal). User chọn một → `POST goals/select` với `learningGoalId`.
2. **Màn Lộ trình của tôi:** Gọi `GET my-path` → hiển thị danh sách item (concept hoặc map) theo thứ tự; item **khóa** (IsUnlocked = false) disable hoặc ẩn nút "Chơi"/"Đọc"; item **đã xong** (IsCompleted) hiển thị dấu tích / sao.
3. **Khi user đọc xong một concept:** Gọi `POST concepts/{id}/complete` → reload my-path hoặc cập nhật local state để mở khóa item tiếp theo.
4. **Khi user chơi map:** Dùng API gameplay hiện có (submit solution); khi có **UserMapResult** (đạt sao) thì my-path tự coi map đó là hoàn thành (backend đã tính từ UserMapResult).
5. **Màn Tiến độ / Dashboard:** Gọi `GET my-path/progress` → hiển thị % hoàn thành, số item đã xong; gợi ý ôn tập từ `suggestedReviewMapIds` (map chưa đạt hoặc đạt ít sao).

## Dữ liệu mẫu (Admin / seed)

### LearningGoal – seed tự động khi chạy app

**LearningGoal** được seed trong `SeedingExtension.SeedInitialDataAsync` (API/Extensions/SeedingExtension.cs). Khi app khởi động với `appsettings.json` có `DataSeeding:EnableSeeding: true`, sẽ tự thêm 4 goal (idempotent theo `Name`, không trùng thì mới insert):

| Name              | Description                                                               | SortOrder |
| ----------------- | ------------------------------------------------------------------------- | --------- |
| Logic cơ bản      | Làm quen với biến, phép toán, thứ tự thực thi và điều khiển luồng cơ bản. | 1         |
| Điều kiện         | Học cách dùng if/else, so sánh và rẽ nhánh trong chương trình.            | 2         |
| Vòng lặp          | Làm chủ for, while và xử lý lặp để giải quyết bài toán.                   | 3         |
| Giải quyết vấn đề | Kết hợp logic, điều kiện và vòng lặp để phân tích và giải bài toán.       | 4         |

- **Cách chạy:** Chạy app (`dotnet run`), seed chạy sau migrate. Không cần thêm migration riêng cho seed.
- **Thêm/sửa goal:** Có thể mở rộng mảng `learningGoalSeeds` trong `SeedingExtension.cs`, hoặc sau này thêm CMS API để CRUD LearningGoal.

### Concept và LearningPathItem

1. **Concept** – seed trong `SeedingExtension` (idempotent theo LearningGoalId + Name).
2. **LearningPathItem** – seed trong `SeedingExtension`; **Map** gán theo `Maps.Title` (khớp `script_clean.sql` / map đã publish). Bảng gợi ý (map mới + fallback legacy):

| Mục tiêu | Concept → Map thử thách (ưu tiên) |
| -------- | -------------------------------- |
| **Logic cơ bản** | Biến → *Introduce variable* · Phép toán → *Mathematical operation* · Thứ tự thực thi → *Platform movement tutorial* |
| **Điều kiện** | If-else → *Introduce trap* · So sánh → *More Box* |
| **Vòng lặp** | For → *Introduce for loop* · While → *Introduce while/do while loop* |
| **Giải quyết vấn đề** | Phân tích → *Basic top down map* · Thuật toán → *Maze map* |

Nếu DB chỉ có map cũ (`level-platform-01`, …), seed tự **fallback** sang title legacy. Seed path item **chỉ chạy khi chưa có dòng (LearningGoalId, SortOrder)** — DB đã seed trước đó sẽ **không** tự đổi map; cần xóa bảng `LearningPathItems` (hoặc chỉ các dòng map) rồi chạy lại API seed, hoặc cập nhật `MapId` thủ công/CMS.

## Migration

Sau khi thêm entity và cấu hình EF, chạy:

```bash
dotnet ef migrations add AddLearningPath --project src/CapstoneProject.Infrastructure --startup-project src/CapstoneProject.API
dotnet ef database update --project src/CapstoneProject.Infrastructure --startup-project src/CapstoneProject.API
```
