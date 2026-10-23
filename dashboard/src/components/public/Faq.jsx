import Container from '../ui/Container.jsx';
import { faqData } from '../../data/homeData.js';

export default function Faq() {
  return (
    <Container
      as="section"
      className="pt-[90px] md:pt-[100px] pb-[80px] md:pb-[90px]"
    >
      <div className="faq-heading ways-copy">
        <h2
          className="faq-title"
          style={{
            fontFamily: "var(--font-heading, 'Manrope', 'DM Sans', sans-serif)",
            fontSize: "clamp(34px, 3.8vw, 48px)",
            fontWeight: 800,
            lineHeight: "normal",
            letterSpacing: "normal",
            color: "#211d1b",
            margin: "0 auto",
            textAlign: "center",
          }}
        >
          {faqData.title}
        </h2>
      </div>

      <div className="faq-list max-w-[860px] mx-auto">
        {faqData.items.map((item) => (
          <details
            key={item.question}
            className="group border-b border-[#e9e1d7] first:border-t"
          >
            <summary className="flex cursor-pointer list-none justify-between gap-5 py-[22px] font-heading text-[17px] font-bold tracking-[-.02em] transition-colors text-[#211d1b] hover:text-[#c62828] group-open:text-[#211d1b] sm:text-[19px] [&::-webkit-details-marker]:hidden">
              <span>{item.question}</span>
              <span className="text-[19px] font-medium text-[#c62828] transition-transform duration-200 group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="max-w-[600px] pr-[25px] pb-[17px] text-base leading-[1.75] text-[#746b66]">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </Container>
  );
}
