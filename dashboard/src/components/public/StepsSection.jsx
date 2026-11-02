import Icon from './Icon';
import { stepsData } from '../../data/homeData';

export default function StepsSection() {
  return (
    <section className="intro-section section-wrap" id="comment-ca-marche">
      <div className="section-heading intro-heading">
        <h2>{stepsData.title}</h2>
      </div>

      <div className="steps-grid">
        {stepsData.steps.map((step) => (
          <article
            key={step.number}
            className={`step-card ${step.accent ? 'step-card-accent' : ''}`}
          >
            <div className="step-top">
              <span className="step-number">{step.number}</span>
              <div className="step-icon">
                <Icon name={step.icon} size={22} />
              </div>
            </div>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
