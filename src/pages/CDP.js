import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { hot } from 'react-hot-loader/root';
import PageContentLayout from 'layouts/PageContentLayout';
import LoadingLayout from 'layouts/LoadingLayout';
import lang from 'languages';
import {
  Box,
  Grid,
  Flex,
  Card,
  Button,
  Table,
  Text
} from '@makerdao/ui-components-core';
import { TextBlock } from 'components/Typography';
import useMaker from 'hooks/useMaker';
import useSidebar from 'hooks/useSidebar';
import useStore from 'hooks/useStore';
import { getIlkData } from 'reducers/feeds';
import ExternalLink from 'components/ExternalLink';

function round(value, decimals) {
  return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
}

const WithSeparators = styled(Box).attrs(() => ({
  borderBottom: '1px solid',
  borderColor: 'grey.300'
}))`
  &:last-child {
    border-bottom: none;
  }
`;

const InfoContainerRow = ({ title, value }) => {
  return (
    <WithSeparators>
      <Grid py="xs" gridTemplateColumns="1fr auto">
        <TextBlock t="body">{title}</TextBlock>
        <TextBlock t="body">{value}</TextBlock>
      </Grid>
    </WithSeparators>
  );
};

const ActionContainerRow = ({ title, value, conversion, button }) => {
  return (
    <WithSeparators>
      <Flex flexWrap="wrap" justifyContent="space-between" py="s">
        <Box alignSelf="center" width="140px">
          <TextBlock color="darkLavender" fontSize="m">
            {title}
          </TextBlock>
        </Box>

        <Box flexGrow="1">
          <Box display="flex">
            <Box flexGrow="1" />
            <Box alignSelf="center">
              <Flex flexDirection="column" width="150px" pr="m">
                <TextBlock
                  t="h5"
                  lineHeight="normal"
                  fontWeight="medium"
                  color="darkLavender"
                  textAlign="right"
                >
                  {value}
                </TextBlock>
                <ExtraInfo textAlign="right">{conversion}</ExtraInfo>
              </Flex>
            </Box>
            <Box alignSelf="center">{button}</Box>
          </Box>
        </Box>
      </Flex>
    </WithSeparators>
  );
};

const ActionButton = ({ children, ...props }) => (
  <Button width="100px" p="xs" variant="secondary" {...props}>
    <TextBlock fontSize="s" color="darkLavender">
      {children}
    </TextBlock>
  </Button>
);

const CdpViewCard = ({ title, children }) => {
  return (
    <Box my="s">
      <Text.h4>{title}</Text.h4>
      <Card px="l" pt="m" pb="s" my="s">
        {children}
      </Card>
    </Box>
  );
};

const AmountDisplay = ({ amount, denomination }) => {
  return (
    <>
      <TextBlock t="h3" lineHeight="1">
        {amount}&nbsp;
      </TextBlock>
      <TextBlock t="h5">{denomination} &nbsp;</TextBlock>
    </>
  );
};

const ExtraInfo = ({ children, ...props }) => {
  return (
    <Text t="caption" lineHeight="none" color="steel" {...props}>
      {children}
    </Text>
  );
};

const CdpViewHistory = ({ title, rows }) => {
  return (
    <Box>
      <Text.h4>{title}</Text.h4>
      <Card px="l" pt="m" pb="l" my="s" css={{ overflowX: 'scroll' }}>
        <Table
          width="100%"
          variant="normal"
          css={`
            td,
            th {
              padding-right: 10px;
            }
          `}
        >
          <thead>
            <tr>
              <th>{lang.table.type}</th>
              <th>{lang.table.activity}</th>
              <th>{lang.table.time}</th>
              <th>{lang.table.sender_id}</th>
              <th>{lang.table.tx_hash}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(
              (
                [collateralType, actionMsg, dateOfAction, senderId, txHash],
                i
              ) => (
                <tr key={i}>
                  <td>
                    <Text color="darkPurple" t="body">
                      {collateralType}
                    </Text>
                  </td>
                  <td
                    css={`
                      white-space: nowrap;
                    `}
                  >
                    <Text color="darkLavender" t="caption">
                      {actionMsg}
                    </Text>
                  </td>
                  <td
                    css={`
                      white-space: nowrap;
                    `}
                  >
                    <Text color="darkLavender" t="caption">
                      {dateOfAction}
                    </Text>
                  </td>
                  <td>
                    <Text t="caption">{senderId}</Text>
                  </td>
                  <td>
                    <Text t="caption">{txHash}</Text>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </Table>
      </Card>
    </Box>
  );
};

function CDPView({ cdpId: _cdpId }) {
  const cdpId = parseInt(_cdpId, 10);
  const { maker, account } = useMaker();
  const { show: showSidebar } = useSidebar();
  const [{ feeds }] = useStore();

  // TODO cdpTypeSlug should become `id` or we should have both cdpTypeSlug AND id.
  const [cdp, setCDP] = useState(null);
  const [daiBalance, setDaiBalance] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setDaiBalance(await maker.getToken('MDAI').balance());
      } catch (err) {
        console.error(
          'Unable to fetch dai balance, no account is currently connected'
        );
      }
    })();
  }, [account, maker]);

  useEffect(() => {
    let didCancel = false;
    (async () => {
      const cdpManager = maker.service('mcd:cdpManager');
      const cdp = await cdpManager.getCdp(cdpId);
      const ilkData = getIlkData(feeds, cdp.ilk);
      const [
        debt,
        collateral,
        collateralPrice,
        collateralizationRatio,
        liquidationPrice,
        daiAvailable,
        minCollateral,
        freeCollateral
      ] = await Promise.all([
        cdp.getDebtValue(),
        cdp.getCollateralAmount(),
        cdp.type.getPrice(),
        cdp.getCollateralizationRatio(),
        cdp.getLiquidationPrice(),
        cdp.getDaiAvailable(),
        cdp.minCollateral(),
        cdp.getCollateralAvailable()
      ]);

      if (didCancel) return;
      setCDP({
        cdp,
        ilkData,
        debt,
        collateral,
        collateralPrice,
        collateralizationRatio,
        liquidationPrice,
        daiAvailable,
        minCollateral,
        freeCollateral
      });
      return () => (didCancel = true);
    })();
  }, [cdpId, feeds, maker]);

  return cdp ? (
    <CDPViewPresentation
      cdp={cdp}
      showSidebar={showSidebar}
      account={account}
      daiBalance={daiBalance}
    />
  ) : (
    <LoadingLayout />
  );
}

function CDPViewPresentation({ cdp, showSidebar, account, daiBalance }) {
  const cdpId = cdp.cdp.id; // FIXME
  const liquidationPrice = round(cdp.liquidationPrice.toNumber(), 2).toFixed(2);
  const gem = cdp.ilkData.gem;
  const collateralPrice = round(cdp.collateralPrice.toNumber(), 2);
  const liquidationPenalty = cdp.ilkData.liquidationPenalty + '%';
  const collateralizationRatio = (
    parseFloat(cdp.collateralizationRatio) * 100
  ).toFixed(2);
  const liquidationRatio = cdp.ilkData.liquidationRatio + '.00%';
  const stabilityFee = cdp.ilkData.rate * 100 + '%';
  const collateralAmount = round(cdp.collateral.toNumber(), 2).toFixed(2);
  const collateralSymbol = cdp.collateral.symbol;
  const collateralUSDValue = round(
    cdp.collateral.times(cdp.collateralPrice).toNumber(),
    2
  );
  const minCollateralAmount = round(cdp.minCollateral.toNumber(), 2);
  const minCollateralValue = round(
    cdp.minCollateral.times(cdp.collateralPrice).toNumber(),
    2
  ).toFixed(2);
  const freeCollateralAmount = round(cdp.freeCollateral.toNumber(), 2);
  const freeCollateralValue = round(
    cdp.freeCollateral.times(cdp.collateralPrice).toNumber(),
    2
  );
  const debtAmount = round(cdp.debt.toNumber(), 2).toFixed(2);
  const debtSymbol = cdp.debt.symbol;
  const daiAvailable = round(cdp.daiAvailable.toNumber(), 2).toFixed(2);

  const mockAddr = '0xDEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEF';
  return (
    <PageContentLayout>
      <Box>
        <Text.h2>
          {lang.cdp} {cdpId}
        </Text.h2>
      </Box>
      <Grid
        py="m"
        gridColumnGap="l"
        gridTemplateColumns={['1fr', '1fr', '1fr 1fr']}
      >
        <CdpViewCard title={lang.cdp_page.liquidation_price}>
          <Flex alignItems="flex-end" mb="xs">
            <AmountDisplay amount={liquidationPrice} denomination="USD" />
            <ExtraInfo>({gem}/USD)</ExtraInfo>
          </Flex>
          <InfoContainerRow
            title={
              <TextBlock>
                {lang.cdp_page.current_price_info}
                <ExtraInfo ml="s">{`(${gem}/USD)`}</ExtraInfo>
              </TextBlock>
            }
            value={collateralPrice}
          />
          <InfoContainerRow
            title={lang.cdp_page.liquidation_penalty}
            value={liquidationPenalty}
          />
        </CdpViewCard>

        <CdpViewCard title={lang.cdp_page.collateralization_ratio}>
          <Flex alignItems="flex-end" mb="xs">
            <AmountDisplay amount={collateralizationRatio} denomination="%" />
          </Flex>
          <InfoContainerRow
            title={lang.cdp_page.minimum_ratio}
            value={liquidationRatio}
          />
          <InfoContainerRow
            title={lang.cdp_page.stability_fee}
            value={stabilityFee}
          />
        </CdpViewCard>

        <CdpViewCard title={`${gem} ${lang.cdp_page.locked.toLowerCase()}`}>
          <Flex alignItems="flex-end" mb="xs">
            <AmountDisplay
              amount={collateralAmount}
              denomination={collateralSymbol}
            />
            <ExtraInfo>{`${collateralUSDValue} USD`}</ExtraInfo>
          </Flex>
          <ActionContainerRow
            title={lang.cdp_page.required_for_safety}
            value={`${minCollateralAmount} ${gem}`}
            conversion={`${minCollateralValue} USD`}
            button={
              <ActionButton
                disabled={!account}
                onClick={() =>
                  showSidebar({
                    sidebarType: 'deposit',
                    sidebarProps: { cdp, cdpId }
                  })
                }
              >
                {lang.actions.deposit}
              </ActionButton>
            }
          />
          <ActionContainerRow
            title={lang.cdp_page.able_withdraw}
            value={`${freeCollateralAmount} ${gem}`}
            conversion={`${freeCollateralValue} USD`}
            button={
              <ActionButton
                disabled={!account}
                onClick={() =>
                  showSidebar({
                    sidebarType: 'withdraw',
                    sidebarProps: { cdp, cdpId }
                  })
                }
              >
                {lang.actions.withdraw}
              </ActionButton>
            }
          />
        </CdpViewCard>

        <CdpViewCard title={`DAI ${lang.cdp_page.position}`}>
          <Flex alignItems="flex-end" mb="xs">
            <AmountDisplay amount={debtAmount} denomination={debtSymbol} />
            <ExtraInfo>{lang.cdp_page.outstanding_debt}</ExtraInfo>
          </Flex>
          {daiBalance ? (
            <ActionContainerRow
              title={`DAI ${lang.cdp_page.wallet_balance}`}
              value={`${parseFloat(daiBalance)} DAI`}
              conversion={`${parseFloat(daiBalance)} USD`} // TODO - this assumes a perfect peg :)
              button={
                <ActionButton
                  disabled={!account}
                  onClick={() =>
                    showSidebar({
                      sidebarType: 'payback',
                      sidebarProps: { cdp, cdpId }
                    })
                  }
                >
                  {lang.actions.pay_back}
                </ActionButton>
              }
            />
          ) : null}
          <ActionContainerRow
            title={lang.cdp_page.able_generate}
            value={`${daiAvailable} DAI`}
            conversion={`${daiAvailable} USD`}
            button={
              <ActionButton
                disabled={!account}
                onClick={() =>
                  showSidebar({
                    sidebarType: 'generate',
                    sidebarProps: { cdp, cdpId }
                  })
                }
              >
                {lang.actions.generate}
              </ActionButton>
            }
          />
        </CdpViewCard>
      </Grid>

      <CdpViewHistory
        title={lang.cdp_page.tx_history}
        rows={[
          [
            'ETH',
            'Paid back 1,000.00 DAI',
            'Feb 15, 2019',
            <ExternalLink key={1} address={mockAddr} network={'kovan'} />,
            <ExternalLink key={2} address={mockAddr} network={'kovan'} />
          ],
          [
            'ETH',
            'Sent 1,000.00 DAI',
            'Feb 12, 2019',
            <ExternalLink key={1} address={mockAddr} network={'kovan'} />,
            <ExternalLink key={2} address={mockAddr} network={'kovan'} />
          ],
          [
            'ETH',
            'Locked 1,000.00 DAI',
            'Feb 09, 2019',
            <ExternalLink key={1} address={mockAddr} network={'kovan'} />,
            <ExternalLink key={2} address={mockAddr} network={'kovan'} />
          ],
          [
            'ETH',
            'Withdrew 3,468.72 ETH',
            'Feb 03, 2019',
            <ExternalLink key={1} address={mockAddr} network={'kovan'} />,
            <ExternalLink key={2} address={mockAddr} network={'kovan'} />
          ],
          [
            'ETH',
            'Opened CDP',
            'Jan 15, 2019',
            <ExternalLink key={1} address={mockAddr} network={'kovan'} />,
            <ExternalLink key={2} address={mockAddr} network={'kovan'} />
          ]
        ]}
      />
    </PageContentLayout>
  );
}

export default hot(CDPView);
