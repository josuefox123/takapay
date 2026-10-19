import Container from '../ui/Container.jsx';
import { faqData } from '../../data/homeData.js';

export default function Faq() {
  return (
    <Container
      as="section"
      className="block pt-[90px] md:pt-[100px] pb-[80px] md:pb-[90px] sm:grid sm:grid-cols-[.8fr_1.2fr] sm:items-center sm:gap-[70px]"
    >
      <div className="faq-heading">
        <h2 className="font-heading text-3xl sm:text-[38px] lg:text-[44px] font-extrabold tracking-[-.04em] text-[#211d1b]">
          {faqData.title}
        </h2>
      </div>

      <div className="faq-list mt-6 sm:mt-0">
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
