import { ArrowRight, Rocket } from "lucide-react";
import Ring from "../effects/Ring";
import { palette } from "../landing.theme";
import { PrimaryButton, SecondaryButton } from "../shared/Buttons";
import Container from "../shared/Container";
import SectionHeading from "../shared/SectionHeading";
import { SurfaceCard } from "../shared/SurfaceCard";

export default function FinaleSection() {
  return (
    <section id="finale" className="relative overflow-hidden px-6 py-24">
      <SectionHeading
        eyebrow="Finale"
        title="Kết lại như một cảnh phóng tàu, không phải như một form đăng ký"
        desc="CTA cuối nên tổng hợp lại cảm giác của toàn bộ landing page: đã đi qua hành trình, đã hiểu sản phẩm, và bây giờ là lúc bắt đầu mission."
      />

      <Container>
        <SurfaceCard className="relative overflow-hidden p-10 text-center shadow-[0_30px_100px_rgba(0,0,0,0.28)]">
          <Ring size={360} top="50%" left="50%" color="rgba(37,99,235,0.16)" duration={24} />
          <Ring size={240} top="50%" left="50%" color="rgba(249,115,22,0.16)" duration={18} />

          <div className="relative z-10">
            <div
              className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ background: "rgba(249,115,22,0.16)", color: palette.accent }}
            >
              <Rocket size={28} />
            </div>

            <h3 className="text-3xl font-bold md:text-5xl" style={{ color: palette.text }}>
              Launch the first learning orbit.
            </h3>

            <p
              className="mx-auto mt-5 max-w-3xl text-lg leading-8"
              style={{ color: palette.text2 }}
            >
              Khi component structure đã ổn định, bước sau sẽ dễ hơn rất nhiều: gắn mascot duck,
              thêm scene riêng cho mascot và không làm vỡ bố cục tổng thể.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <PrimaryButton>
                Start the mission
                <ArrowRight size={18} />
              </PrimaryButton>
              <SecondaryButton>Explore challenge flow</SecondaryButton>
            </div>
          </div>
        </SurfaceCard>
      </Container>
    </section>
  );
}
