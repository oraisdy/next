import React from 'react';
import { findDOMNode } from 'react-dom';
import PropTypes from 'prop-types';
import { polyfill } from 'react-lifecycles-compat';
import findLastIndex from 'lodash.findlastindex';
import { dom } from '../util';
import VirtualBody from './virtual/body';
import { statics } from './util';

const noop = () => {};
const THRESHOLD = 10;
export default function virtual(BaseComponent) {
    class VirtualTable extends React.Component {
        static VirtualBody = VirtualBody;
        static propTypes = {
            /**
             * 是否开启虚拟滚动
             */
            useVirtual: PropTypes.bool,
            /**
             * 设置行高
             */
            rowHeight: PropTypes.oneOfType([PropTypes.number, PropTypes.func]),
            threshold: PropTypes.number,
            maxBodyHeight: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
            primaryKey: PropTypes.oneOfType([PropTypes.symbol, PropTypes.string]),
            dataSource: PropTypes.array,
            /**
             * 在内容区域滚动的时候触发的函数
             */
            onBodyScroll: PropTypes.func,
            ...BaseComponent.propTypes,
        };

        static defaultProps = {
            ...BaseComponent.defaultProps,
            primaryKey: 'id',
            rowHeight: null,
            maxBodyHeight: 200,
            components: {},
            prefix: 'next-',
            threshold: THRESHOLD,
            onBodyScroll: noop,
        };

        static childContextTypes = {
            onVirtualScroll: PropTypes.func,
            bodyHeight: PropTypes.number,
            innerTop: PropTypes.number,
            getBodyNode: PropTypes.func,
            getTableInstanceForVirtual: PropTypes.func,
            rowSelection: PropTypes.object,
        };

        static computeVirtualPosMetadata(dataSource, rowHeight) {
            const metadata = [];
            let offset = 0;
            dataSource.forEach((record, i) => {
                const height = rowHeight(record, i);
                metadata.push({ offset, height });
                offset += height;
            });
            return metadata;
        }

        constructor(props, context) {
            super(props, context);
            const { useVirtual, dataSource } = props;

            const hasVirtualData = useVirtual && dataSource && dataSource.length > 0;

            this.state = {
                scrollToRow: this.props.scrollToRow,
                height: this.props.maxBodyHeight === 10000 ? window.innerHeight : this.props.maxBodyHeight,
                hasVirtualData,
            };
            this.virtualPosMetadata = [];
        }

        getChildContext() {
            return {
                onVirtualScroll: this.onScroll,
                bodyHeight: this.computeBodyHeight(),
                innerTop: this.computeInnerTop(),
                getBodyNode: this.getBodyNode,
                getTableInstanceForVirtual: this.getTableInstance,
                rowSelection: this.rowSelection,
            };
        }

        static getDerivedStateFromProps(nextProps, prevState) {
            const state = {};

            if ('maxBodyHeight' in nextProps) {
                if (prevState.height !== nextProps.maxBodyHeight) {
                    state.height = nextProps.maxBodyHeight === 10000 ? window.innerHeight : nextProps.maxBodyHeight;
                }
            }

            if ('scrollToRow' in nextProps) {
                state.scrollToRow = nextProps.scrollToRow;
            }

            if (prevState.useVirtual !== nextProps.useVirtual || prevState.dataSource !== nextProps.dataSource) {
                state.hasVirtualData = nextProps.useVirtual && nextProps.dataSource && nextProps.dataSource.length > 0;
                state.dataSource = nextProps.dataSource;
                state.useVirtual = nextProps.useVirtual;
            }

            return state;
        }

        componentDidMount() {
            if (this.state.hasVirtualData && this.bodyNode) {
                this.lastScrollTop = this.bodyNode.scrollTop;
            }

            this.adjustScrollTop();
            this.adjustSize();
        }

        componentDidUpdate() {
            this.adjustScrollTop();
            this.adjustSize();
        }

        computeBodyHeight() {
            const { rowHeight } = this.props;
            const { dataSource } = this.props;
            if (!rowHeight) {
                return 0;
            }
            if (typeof rowHeight === 'function') {
                const lastRow = this.virtualPosMetadata[this.virtualPosMetadata.length - 1];
                return lastRow ? lastRow.height + lastRow.offset : 0;
            }
            let count = 0;
            dataSource.forEach(item => {
                if (!item.__hidden) {
                    count += 1;
                }
            });
            return count * rowHeight;
        }

        computeInnerTop() {
            const { rowHeight } = this.props;

            if (!rowHeight) {
                return 0;
            }

            const start = Math.max(this.start - this.props.threshold, 0);

            if (typeof rowHeight === 'function') {
                return start >= 0 ? (this.virtualPosMetadata[start] || {}).offset : 0;
            }

            return start * rowHeight;
        }

        getVisibleRange(ExpectStart) {
            const { height, rowHeight } = this.props;
            const len = this.props.dataSource.length;

            let end,
                visibleCount = 0;
            let start = 0;
            if (!rowHeight) {
                // try get cell height;
                end = 1;
            } else {
                if ('number' === typeof ExpectStart) {
                    start = ExpectStart < len ? ExpectStart : 0;
                }
                if (typeof rowHeight === 'function') {
                    visibleCount = 0;
                    let visibleHeight = dom.getPixels(height);
                    for (let i = start; i < len; i++, visibleCount++) {
                        visibleHeight -= this.virtualPosMetadata[i].height;
                        if (visibleHeight <= 0) break;
                    }
                } else {
                    visibleCount = parseInt(dom.getPixels(height) / rowHeight, 10);
                }

                end = Math.min(+start + 1 + visibleCount + this.props.threshold, len);
            }
            this.end = end;
            this.visibleCount = visibleCount;
            return {
                start,
                end,
            };
        }

        adjustScrollTop() {
            if (this.state.hasVirtualData && this.bodyNode) {
                if (typeof this.props.rowHeight === 'function') {
                    if (this.state.scrollToRow !== this.start) {
                        const currentRow = this.virtualPosMetadata[this.state.scrollToRow];
                        if (currentRow) {
                            this.bodyNode.scrollTop = currentRow.offset;
                        }
                    }
                    return;
                }
                this.bodyNode.scrollTop =
                    (this.lastScrollTop % this.props.rowHeight) + this.props.rowHeight * this.state.scrollToRow;
            }
        }

        adjustSize() {
            if (this.state.hasVirtualData && this.bodyNode) {
                const body = this.bodyNode;
                const virtualScrollNode = body.querySelector('div');
                const { clientHeight, clientWidth } = body;

                const tableInc = this.tableInc;
                const tableNode = findDOMNode(tableInc);
                const { prefix } = this.props;
                const headerNode = tableNode.querySelector(`.${prefix}table-header table`);
                const headerClientWidth = headerNode && headerNode.clientWidth;
                // todo 2.0 设置宽度这个可以去掉
                if (clientWidth < headerClientWidth) {
                    dom.setStyle(virtualScrollNode, 'min-width', headerClientWidth);
                    const leftNode = this.bodyLeftNode;
                    const rightNode = this.bodyRightNode;
                    leftNode && dom.setStyle(leftNode, 'max-height', clientHeight);
                    rightNode && dom.setStyle(rightNode, 'max-height', clientHeight);
                } else {
                    dom.setStyle(virtualScrollNode, 'min-width', 'auto');
                }
            }
        }

        onScroll = () => {
            // 避免横向滚动带来的性能问题
            const scrollTop = this.bodyNode.scrollTop;
            if (scrollTop === this.lastScrollTop) {
                return;
            }
            const start = this.computeScrollToRow(scrollTop);
            if (!('scrollToRow' in this.props) && start !== this.state.scrollToRow) {
                this.setState({
                    scrollToRow: start,
                });
            }
            if (this.start !== start) {
                this.start = start;
                this.props.onBodyScroll(start);
                this.lastScrollTop = scrollTop;
            }
        };

        computeScrollToRow(offset) {
            const { rowHeight } = this.props;
            let start = 0;
            if (typeof rowHeight === 'function') {
                start = findLastIndex(this.virtualPosMetadata, row => row.offset <= offset);
            } else {
                start = parseInt(offset / rowHeight);
            }
            return start;
        }

        getBodyNode = (node, lockType) => {
            lockType = lockType ? lockType.charAt(0).toUpperCase() + lockType.substr(1) : '';
            this[`body${lockType}Node`] = node;
        };

        getTableInstance = (type, instance) => {
            type = type ? type.charAt(0).toUpperCase() + type.substr(1) : '';
            this[`table${type}Inc`] = instance;
        };

        getRowNode() {
            try {
                // in case of finding an unmounted component due to cached data
                // need to clear refs of this.tableInc when dataSource Changed
                // use try catch for temporary
                return findDOMNode(this.tableInc.getRowRef(0));
            } catch (error) {
                return null;
            }
        }

        render() {
            /* eslint-disable no-unused-vars, prefer-const */
            let {
                useVirtual,
                components,
                dataSource,
                fixedHeader,
                rowHeight,
                scrollToRow,
                onBodyScroll,
                threshold,
                ...others
            } = this.props;

            if (this.state.hasVirtualData && typeof rowHeight === 'function') {
                this.virtualPosMetadata = VirtualTable.computeVirtualPosMetadata(this.props.dataSource, rowHeight);
            }

            const entireDataSource = dataSource;
            let newDataSource = dataSource;

            this.rowSelection = this.props.rowSelection;
            if (this.state.hasVirtualData) {
                newDataSource = [];
                components = { ...components };
                const { start, end } = this.getVisibleRange(this.state.scrollToRow);
                let count = -1;
                dataSource.forEach((current, index, record) => {
                    if (!current.__hidden) {
                        count += 1;
                        if (count >= Math.max(start - threshold, 0) && count < end) {
                            newDataSource.push(current);
                        }
                    }
                    current.__rowIndex = index;
                });

                if (!components.Body) {
                    components.Body = VirtualBody;
                }
                fixedHeader = true;
            }

            return (
                <BaseComponent
                    {...others}
                    scrollToRow={scrollToRow}
                    dataSource={newDataSource}
                    entireDataSource={entireDataSource}
                    components={components}
                    fixedHeader={fixedHeader}
                />
            );
        }
    }
    statics(VirtualTable, BaseComponent);
    return polyfill(VirtualTable);
}
