import Icon from './Icon';
import { securityData } from '../../data/homeData';

export default function Security() {
  return (
    <section className="security-section" id="securite">
      <div className="security-inner section-wrap">
        <div className="security-mark">
          <Icon name="shield" size={35} />
        </div>

        <div className="security-main">
          <h2>{securityData.title}</h2>
          <p>{securityData.description}</p>
        </div>

        <div className="security-points">
          {securityData.points.map((point) => (
            <div key={point.title}>
              <span className="security-point-icon">
                <Icon name="check" size={17} />
              </span>
              <p>
                <b>{point.title}</b>
                <br />
                {point.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
